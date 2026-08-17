#!/usr/bin/env python3
"""
FPL Draft League Data Ingestion

Fetches all available data from draft.premierleague.com for your league and
saves it locally for analysis. No authentication required for public league data.
"""

import json
import os
import sys
from pathlib import Path

import requests

# API base URLs (player/element IDs: always use DRAFT_API — classic uses a different id→player map)
DRAFT_API = "https://draft.premierleague.com/api"
# Classic API: fixtures (schedule / team pairing) + bootstrap-static (events for
# gameweek resolution, prices, ownership). Element id space differs from draft —
# reconciled later via Opta code, never used for direct element lookups.
FPL_CLASSIC_API = "https://fantasy.premierleague.com/api"


def get_league_id() -> int:
    """Get league ID from environment or command-line argument."""
    league_id = os.environ.get("LEAGUE_ID")
    if league_id:
        return int(league_id)
    if len(sys.argv) > 1:
        return int(sys.argv[1])
    print(
        "Usage: python ingest.py <LEAGUE_ID>\n"
        "   or: LEAGUE_ID=12345 python ingest.py\n\n"
        "Find your league ID in the URL when viewing your league:\n"
        "  draft.premierleague.com/league/YOUR_LEAGUE_ID"
    )
    sys.exit(1)


def fetch_json(url: str) -> dict:
    """Fetch JSON from URL, raising on error."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _normalize_name(value) -> str:
    return str(value or "").strip().lower()


def known_manager_last_names(committed_details_path: Path) -> set:
    """Last names of this league's managers, from the committed prior snapshot."""
    try:
        d = json.loads(committed_details_path.read_text())
    except (OSError, json.JSONDecodeError):
        return set()
    if d.get("isSample"):
        return set()
    return {
        _normalize_name(e.get("player_last_name"))
        for e in d.get("league_entries") or []
        if _normalize_name(e.get("player_last_name"))
    }


def league_identity_matches(fetched_details: dict, known_last_names: set) -> bool:
    """True when at least half the fetched managers share a last name with the
    committed league. FPL Draft reissues league ids every season, so a stale
    FPL_LEAGUE_ID silently resolves to a stranger's league — this catches that.
    """
    if not known_last_names:
        return True
    entries = fetched_details.get("league_entries") or []
    if not entries:
        return True  # emptiness is validated separately
    matches = sum(
        1 for e in entries if _normalize_name(e.get("player_last_name")) in known_last_names
    )
    return matches * 2 >= len(entries)


def guard_league_identity(league_id: int, fetched_details: dict) -> None:
    """Refuse to ingest a league that clearly isn't ours (stale id after rollover)."""
    if os.environ.get("ALLOW_LEAGUE_IDENTITY_MISMATCH") == "1":
        return
    committed = Path(__file__).parent / "web/public/league-data/details.json"
    known = known_manager_last_names(committed)
    if league_identity_matches(fetched_details, known):
        return
    managers = ", ".join(
        f"{e.get('player_first_name', '')} {e.get('player_last_name', '')}".strip()
        for e in fetched_details.get("league_entries") or []
    )
    print(
        f"\nERROR: league {league_id} on the FPL Draft API is a DIFFERENT league.\n"
        f'  Fetched "{fetched_details.get("league", {}).get("name", "?")}" with managers: {managers}\n'
        f"  None/few of them match this league's known managers ({', '.join(sorted(known))}).\n"
        "  FPL Draft issues a NEW league id every season, so a stale FPL_LEAGUE_ID\n"
        "  resolves to a stranger's league after rollover. Update the FPL_LEAGUE_ID\n"
        "  secret/variable to the new season's id (the number in the URL at\n"
        "  draft.premierleague.com/league/<ID> while logged in).\n"
        "  Intentionally switching leagues? Re-run with ALLOW_LEAGUE_IDENTITY_MISMATCH=1.",
        file=sys.stderr,
    )
    sys.exit(1)


def ingest_league(league_id: int, output_dir: Path) -> None:
    """Fetch all FPL Draft data for a league and save to output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Details first, validated BEFORE anything is written: if the id resolves to
    # a stranger's league, nothing lands in data/ for copy-data to pick up.
    print("Fetching details...")
    try:
        details = fetch_json(f"{DRAFT_API}/league/{league_id}/details")
    except Exception as e:
        print(f"\nERROR: could not fetch league {league_id} details: {e}", file=sys.stderr)
        sys.exit(1)
    guard_league_identity(league_id, details)
    details_out = output_dir / "details.json"
    with open(details_out, "w") as f:
        json.dump(details, f, indent=2)
    print(f"  -> saved to {details_out}")

    endpoints = [
        ("element_status", f"{DRAFT_API}/league/{league_id}/element-status"),
        ("transactions", f"{DRAFT_API}/draft/league/{league_id}/transactions"),
        ("trades", f"{DRAFT_API}/draft/league/{league_id}/trades"),
        ("bootstrap_draft", f"{DRAFT_API}/bootstrap-static"),
    ]

    for name, url in endpoints:
        print(f"Fetching {name}...")
        try:
            data = fetch_json(url)
            out_file = output_dir / f"{name}.json"
            with open(out_file, "w") as f:
                json.dump(data, f, indent=2)
            print(f"  -> saved to {out_file}")
        except requests.HTTPError as e:
            print(f"  -> failed: {e}")
        except Exception as e:
            print(f"  -> error: {e}")

    # Fixtures: classic endpoint (schedule data; no draft element ids)
    print("Fetching fixtures...")
    try:
        fixtures = fetch_json(f"{FPL_CLASSIC_API}/fixtures")
        with open(output_dir / "fixtures.json", "w") as f:
            json.dump(fixtures, f, indent=2)
        print(f"  -> saved to {output_dir / 'fixtures.json'}")
    except Exception as e:
        print(f"  -> error: {e}")

    # Classic bootstrap-static: the `events` array drives prediction gameweek
    # resolution (is_next / is_current), plus price/ownership. Refreshing this
    # each ingest is what keeps the forecast target gameweek current — without
    # it the build stays pinned to whatever GW was "next" when the file was
    # last captured.
    print("Fetching bootstrap_fpl (classic)...")
    try:
        classic = fetch_json(f"{FPL_CLASSIC_API}/bootstrap-static/")
        with open(output_dir / "bootstrap_fpl.json", "w") as f:
            json.dump(classic, f, indent=2)
        print(f"  -> saved to {output_dir / 'bootstrap_fpl.json'}")
    except Exception as e:
        print(f"  -> error: {e}")

    details_path = output_dir / "details.json"
    if not details_path.is_file() or details_path.stat().st_size < 100:
        print("\nERROR: details.json missing or empty — league ID wrong or API failed.", file=sys.stderr)
        sys.exit(1)
    try:
        d = json.loads(details_path.read_text())
        if not d.get("league_entries"):
            print("\nERROR: details.json has no league_entries.", file=sys.stderr)
            sys.exit(1)
    except (json.JSONDecodeError, OSError) as e:
        print(f"\nERROR: invalid details.json: {e}", file=sys.stderr)
        sys.exit(1)

    print("\nIngestion complete. Data saved to", output_dir)


def main():
    league_id = get_league_id()
    output_dir = Path(__file__).parent / "data"
    ingest_league(league_id, output_dir)


if __name__ == "__main__":
    main()
