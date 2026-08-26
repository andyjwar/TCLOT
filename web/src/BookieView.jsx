import { useCallback, useEffect, useMemo, useState } from 'react'
import { TeamAvatar } from './TeamAvatar'
import { standingsMobileTeamName } from './teamNameUtils.js'
import { describeBet, describeBetCompact, SEASON_PLACE_KINDS } from './bookieBetLabel.js'
import {
  bookieEnabled,
  fetchBookieState,
  loadBookieSession,
  saveBookieSession,
  clearBookieSession,
  registerBookie,
  loginBookie,
  placeBookieBet,
  fetchCashoutQuotes,
  cashoutBookieBet,
} from './bookieApi.js'
import { decimalOddsToFraction } from './oddsFormat.js'
import './BookieView.css'

/** "Fri 28 Aug, 18:30" in the viewer's locale. */
function fmtDeadline(iso) {
  const t = Date.parse(iso ?? '')
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Coarse countdown for an open market: "2d 4h", "3h 10m", "12m". */
function fmtCountdown(iso, nowMs) {
  const t = Date.parse(iso ?? '')
  if (!Number.isFinite(t)) return null
  const ms = t - nowMs
  if (ms <= 0) return null
  const mins = Math.floor(ms / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins % 60}m`
  return `${mins}m`
}

function fmtCoins(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString()
}

/**
 * Traditional fractional price for display — markets are generated on the
 * fractional ladder (build-bookie-markets.mjs snaps them), so this is exact.
 * Decimal is kept as a tooltip for anyone who thinks in multipliers.
 */
function fmtOdds(odds) {
  return decimalOddsToFraction(odds) ?? Number(odds).toFixed(2)
}

function fmtNet(n) {
  const v = Number(n) || 0
  return `${v > 0 ? '+' : ''}${v.toLocaleString()}`
}

function betReturnTone(status) {
  if (status === 'won') return 'won'
  if (status === 'lost') return 'lost'
  if (status === 'cashed_out') return 'cashed'
  if (status === 'void') return 'void'
  return 'open'
}

/**
 * What a ticket is worth in the Return column: still running means the
 * potential payout, settled means whatever it actually paid.
 */
function betReturnValue(bet) {
  if (bet.status === 'open' || bet.status == null) {
    return Math.round(Number(bet.stake) * Number(bet.odds))
  }
  if (bet.status === 'won' || bet.status === 'cashed_out') return Number(bet.payout) || 0
  if (bet.status === 'void') return Number(bet.stake) || 0
  return 0
}

function betReturnLabel(bet) {
  if (bet.status === 'lost') return '—'
  return fmtCoins(betReturnValue(bet))
}

function BetColHead() {
  return (
    <li className="bookie-bet bookie-bet--head" aria-hidden="true">
      <span className="bookie-bet__desc" />
      <span className="bookie-bet__col">Odds</span>
      <span className="bookie-bet__col">Wager</span>
      <span className="bookie-bet__col">Return</span>
    </li>
  )
}

/** Footer row totalling the wager and return columns for a list of tickets. */
function BetTotals({ bets }) {
  const staked = bets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0)
  const returns = bets.reduce((sum, b) => sum + betReturnValue(b), 0)
  return (
    <li className="bookie-bet bookie-bet--total">
      <span className="bookie-bet__desc">Total</span>
      <span className="bookie-bet__col" />
      <span className="bookie-bet__pill bookie-bet__pill--wager tabular">{fmtCoins(staked)}</span>
      <span className="bookie-bet__pill bookie-bet__pill--return bookie-bet__pill--open tabular">
        {fmtCoins(returns)}
      </span>
    </li>
  )
}

function BetTicketFigures({ bet }) {
  const tone = betReturnTone(bet.status)
  return (
    <>
      <span
        className="bookie-bet__col bookie-bet__col--odds tabular"
        title={`decimal ${Number(bet.odds).toFixed(2)}`}
      >
        {fmtOdds(bet.odds)}
      </span>
      <span className="bookie-bet__pill bookie-bet__pill--wager tabular">{fmtCoins(bet.stake)}</span>
      <span className={`bookie-bet__pill bookie-bet__pill--return bookie-bet__pill--${tone} tabular`}>
        {betReturnLabel(bet)}
      </span>
    </>
  )
}

/**
 * The Bookie tab — fake-money betting against the site's own model.
 *
 * Everything financial lives in the bookie Worker (web/workers/bookie/);
 * this view is a thin client: pick your team + PIN once, then back weekly
 * H2H matchups and the outright champion with coins. Odds shown are the
 * decimal prices frozen into each market, so stake × odds is exactly what
 * a winning ticket pays.
 */
export function BookieView({ teamLogoMap = {}, kitIndexByEntry }) {
  const enabled = bookieEnabled()
  const [session, setSession] = useState(() => (enabled ? loadBookieSession() : null))
  const [state, setState] = useState(null)
  const [failed, setFailed] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  /** { marketId, selection, label, odds } while the slip is open. */
  const [slip, setSlip] = useState(null)
  /** betId → current cash-out offer in Clotcoins (open bets only). */
  const [cashoutQuotes, setCashoutQuotes] = useState(() => new Map())

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), [])

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    setFailed(false)
    fetchBookieState(session?.token ?? null)
      .then((json) => {
        if (!alive) return
        setState(json)
        // A token the Worker no longer honors (season rolled, secret rotated)
        // comes back without `me` — drop it so the login card reappears.
        if (session && !json?.me) {
          clearBookieSession()
          setSession(null)
        }
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    // Cash-out offers ride along with every state refresh; a failure just
    // means no buttons this round, never a broken tab.
    if (session?.token) {
      fetchCashoutQuotes(session.token)
        .then((json) => {
          if (!alive) return
          setCashoutQuotes(
            new Map((json?.quotes ?? []).map((q) => [Number(q.betId), Number(q.value)])),
          )
        })
        .catch(() => {
          if (alive) setCashoutQuotes(new Map())
        })
    } else {
      setCashoutQuotes(new Map())
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session?.token, refreshNonce])

  const onLoggedIn = useCallback((auth) => {
    const next = { token: auth.token, entryId: auth.entryId, name: auth.name }
    saveBookieSession(next)
    setSession(next)
  }, [])

  const onLogout = useCallback(() => {
    clearBookieSession()
    setSession(null)
    setSlip(null)
  }, [])

  if (!enabled) {
    return (
      <section className="tile tile--compact" aria-label="Bookie">
        <h2 className="tile-title tile-title--sm">TCLOT Bookie</h2>
        <p className="bookie__note">
          The bookie backend is not configured for this deploy. Deploy the Worker in{' '}
          <code>web/workers/bookie/</code> and set <code>VITE_BOOKIE_API_URL</code> to its
          URL at build time (see <code>DEPLOY.md</code>).
        </p>
      </section>
    )
  }

  if (failed) {
    return (
      <section className="tile tile--compact" aria-label="Bookie">
        <h2 className="tile-title tile-title--sm">TCLOT Bookie</h2>
        <p className="bookie__note">The bookie is unreachable right now — try again shortly.</p>
      </section>
    )
  }

  if (!state) {
    return (
      <section className="tile tile--compact" aria-label="Bookie">
        <h2 className="tile-title tile-title--sm">TCLOT Bookie</h2>
        <p className="bookie__note">Opening the book…</p>
      </section>
    )
  }

  const me = state.me ?? null
  const markets = Array.isArray(state.markets) ? state.markets : []
  const h2hMarkets = markets.filter((m) => m.kind === 'h2h')
  const placeMarkets = markets.filter((m) => SEASON_PLACE_KINDS.includes(m.kind))
  const rosterMarket =
    placeMarkets.find((m) => m.kind === 'outright') ?? placeMarkets[0] ?? null
  const openGw = h2hMarkets.find((m) => m.open)?.gw ?? null
  const weeklyOpen = openGw != null ? h2hMarkets.filter((m) => m.gw === openGw) : []
  const nameByEntry = new Map(
    (state.leaderboard ?? []).map((u) => [Number(u.entryId), u.name]),
  )
  for (const m of placeMarkets) {
    for (const s of m.payload?.selections ?? []) {
      if (!nameByEntry.has(Number(s.entryId))) nameByEntry.set(Number(s.entryId), s.name)
    }
  }

  return (
    <div className="dashboard-stack">
      <BookieHeader me={me} state={state} onLogout={onLogout} />

      {!me ? (
        <BookieLogin
          roster={rosterMarket?.payload?.selections ?? []}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
          onLoggedIn={onLoggedIn}
        />
      ) : null}

      <WeeklyMarkets
        gw={openGw}
        markets={weeklyOpen}
        me={me}
        slip={slip}
        onPick={setSlip}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />

      {slip && me ? (
        <BetSlip
          slip={slip}
          me={me}
          minStake={state.minStake ?? 10}
          token={session?.token}
          onClose={() => setSlip(null)}
          onPlaced={() => {
            setSlip(null)
            refresh()
          }}
        />
      ) : null}

      {placeMarkets.length > 0 ? (
        <SeasonPlaceBoard
          markets={placeMarkets}
          me={me}
          onPick={setSlip}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      ) : null}

      {me ? (
        <MyBets
          me={me}
          markets={markets}
          nameByEntry={nameByEntry}
          cashoutQuotes={cashoutQuotes}
          token={session?.token}
          onCashedOut={refresh}
        />
      ) : null}

      <LiveBets
        state={state}
        me={me}
        markets={markets}
        nameByEntry={nameByEntry}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />

      <BookieLeaderboards
        state={state}
        me={me}
        nameByEntry={nameByEntry}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />

      <section className="tile tile--compact" aria-label="How the bookie works">
        <h3 className="bookie__method-title">House rules</h3>
        <p className="bookie__note">
          Every manager starts the season with {fmtCoins(state.startingBalance ?? 1000)}{' '}
          Clotcoins — the official TCLOT currency: completely fake, worthless, and worth
          fighting over. Odds are set by the same model behind the Season Predictions tab,
          with a small house margin, and quoted as traditional fractions. Weekly matchup
          markets close at the FPL deadline; Champion, Titan, Minnow and last-place
          boards reprice after every gameweek but your ticket keeps the odds you took.
          Every ticket is public — the live bets board shows what everyone has riding
          this week. Bets settle as soon as the football finishes, and a{' '}
          {fmtCoins(state.weeklyStipend ?? 50)}-Clotcoin stipend lands after
          each gameweek so going bust is embarrassing, not terminal. Open tickets carry a
          cash-out offer — what your position is worth right now, minus the house's cut.
          Once the gameweek kicks off the offer tracks the live scores, so when your long
          shot is 20 points up the bookie will dangle a tidy guaranteed profit in front of
          you and quietly hope you take it.
        </p>
      </section>
    </div>
  )
}

function BookieHeader({ me, state, onLogout }) {
  return (
    <section className="tile tile--compact bookie-header" aria-label="Bookie account">
      <div className="tile-head-row tile-head-row--tight">
        <h2 className="tile-title tile-title--sm">TCLOT Bookie</h2>
        {state.season ? <span className="bookie-header__season tabular">{state.season}</span> : null}
      </div>
      {me ? (
        <div className="bookie-header__account">
          <span className="bookie-header__who">
            Betting as <strong>{standingsMobileTeamName(me.name)}</strong>
          </span>
          <span className="bookie-header__balance tabular" title="Clotcoin balance">
            {fmtCoins(me.balance)} Clotcoins
          </span>
          <button type="button" className="bookie-header__logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </section>
  )
}

function BookieLogin({ roster, teamLogoMap, kitIndexByEntry, onLoggedIn }) {
  const [entryId, setEntryId] = useState(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (mode) => {
    if (entryId == null || !/^\d{4,8}$/.test(pin)) {
      setError('Pick your team and enter a 4–8 digit PIN.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const auth =
        mode === 'register' ? await registerBookie(entryId, pin) : await loginBookie(entryId, pin)
      onLoggedIn(auth)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tile tile--compact bookie-login" aria-label="Claim your team">
      <h3 className="bookie__section-title">Who are you?</h3>
      {roster.length === 0 ? (
        <p className="bookie__note">
          The book has no roster yet — markets open once the site deploys with the next
          gameweek's sheet.
        </p>
      ) : (
        <>
          <div className="bookie-login__pick-row">
            {entryId != null ? (
              <TeamAvatar
                entryId={entryId}
                name={roster.find((t) => Number(t.entryId) === entryId)?.name ?? ''}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            ) : null}
            <select
              className="bookie-login__select"
              value={entryId ?? ''}
              onChange={(e) => setEntryId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Your team"
            >
              <option value="" disabled>
                Pick your team…
              </option>
              {roster.map((t) => (
                <option key={t.entryId} value={t.entryId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="bookie-login__pin-row">
            <input
              className="bookie-login__pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="PIN (4–8 digits)"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              aria-label="PIN"
            />
            <button
              type="button"
              className="bookie__btn bookie__btn--primary"
              disabled={busy}
              onClick={() => submit('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className="bookie__btn"
              disabled={busy}
              onClick={() => submit('register')}
            >
              First time — claim team
            </button>
          </div>
          <p className="bookie__note bookie__note--small">
            First visit: pick your team, choose a PIN, hit “claim team”. The PIN stops your
            rivals betting your bankroll on last place — it is honor-system security, not
            banking security.
          </p>
          {error ? <p className="bookie__error" role="alert">{error}</p> : null}
        </>
      )}
    </section>
  )
}

function OddsButton({ label, odds, active, disabled, onClick }) {
  return (
    <button
      type="button"
      className={'bookie-odds-btn' + (active ? ' bookie-odds-btn--active' : '')}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="bookie-odds-btn__label">{label}</span>
      <span className="bookie-odds-btn__odds tabular" title={`decimal ${Number(odds).toFixed(2)}`}>
        {fmtOdds(odds)}
      </span>
    </button>
  )
}

function WeeklyMarkets({ gw, markets, me, slip, onPick, teamLogoMap, kitIndexByEntry }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (gw == null || markets.length === 0) {
    return (
      <section className="tile tile--compact" aria-label="Weekly markets">
        <h3 className="bookie__section-title">This week's matchups</h3>
        <p className="bookie__note">
          No open weekly market right now — the next gameweek's board opens when the site
          rebuilds after results are banked.
        </p>
      </section>
    )
  }

  const deadline = markets[0]?.closesAt
  const countdown = fmtCountdown(deadline, nowMs)

  return (
    <section className="tile tile--compact" aria-label="Weekly markets">
      <div className="tile-head-row tile-head-row--tight">
        <h3 className="bookie__section-title">GW{gw} matchups</h3>
        <span className="bookie__deadline tabular">
          {countdown ? `closes in ${countdown}` : `closes ${fmtDeadline(deadline) ?? 'soon'}`}
        </span>
      </div>
      <ul className="bookie-market-list">
        {markets.map((m) => {
          const p = m.payload
          const pickFor = (selection, label, odds) => () =>
            onPick({
              marketId: m.id,
              selection,
              label,
              odds,
              detail: `${standingsMobileTeamName(p.homeName)} v ${standingsMobileTeamName(p.awayName)} · GW${gw}`,
            })
          const isActive = (selection) => slip?.marketId === m.id && slip?.selection === selection
          return (
            <li key={m.id} className="bookie-market">
              <div className="bookie-market__teams">
                <span className="bookie-market__team">
                  <TeamAvatar
                    entryId={p.homeEntryId}
                    name={p.homeName}
                    size="sm"
                    logoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                  <span>{standingsMobileTeamName(p.homeName)}</span>
                </span>
                <span className="bookie-market__vs" aria-hidden>v</span>
                <span className="bookie-market__team bookie-market__team--away">
                  <span>{standingsMobileTeamName(p.awayName)}</span>
                  <TeamAvatar
                    entryId={p.awayEntryId}
                    name={p.awayName}
                    size="sm"
                    logoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                </span>
              </div>
              <div className="bookie-market__odds" role="group" aria-label="Match odds">
                <OddsButton
                  label={standingsMobileTeamName(p.homeName)}
                  odds={p.odds.home}
                  active={isActive('home')}
                  disabled={!me || !m.open}
                  onClick={pickFor('home', `${standingsMobileTeamName(p.homeName)} to win`, p.odds.home)}
                />
                <OddsButton
                  label="Draw"
                  odds={p.odds.draw}
                  active={isActive('draw')}
                  disabled={!me || !m.open}
                  onClick={pickFor('draw', 'Draw', p.odds.draw)}
                />
                <OddsButton
                  label={standingsMobileTeamName(p.awayName)}
                  odds={p.odds.away}
                  active={isActive('away')}
                  disabled={!me || !m.open}
                  onClick={pickFor('away', `${standingsMobileTeamName(p.awayName)} to win`, p.odds.away)}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {!me ? (
        <p className="bookie__note bookie__note--small">Log in above to back someone.</p>
      ) : null}
    </section>
  )
}

const PLACE_TABS = [
  {
    kind: 'outright',
    tab: 'Champion',
    title: 'Outright — league champion',
    verb: 'Champion',
    crown: 'Champion',
    slipLabel: (name) => `${name} to win the league`,
    detail: 'Outright champion',
    note: 'Pays if they win the league. Odds track Season Predictions and reprice weekly — your ticket locks the price you took.',
  },
  {
    kind: 'titan',
    tab: 'Titan',
    title: 'Titan — finish top 4',
    verb: 'Titan',
    crown: 'Titan',
    slipLabel: (name) => `${name} to finish Titan (top 4)`,
    detail: 'Titan (top 4)',
    note: 'Pays if they finish 1st–4th. Four tickets can win this market.',
  },
  {
    kind: 'minnow',
    tab: 'Minnow',
    title: 'Minnow — finish bottom 4',
    verb: 'Minnow',
    crown: 'Minnow',
    slipLabel: (name) => `${name} to finish Minnow (bottom 4)`,
    detail: 'Minnow (bottom 4)',
    note: 'Pays if they finish 5th–8th. Four tickets can win this market.',
  },
  {
    kind: 'last',
    tab: 'Last',
    title: 'Last place',
    verb: 'Last',
    crown: 'Last',
    slipLabel: (name) => `${name} to finish last`,
    detail: 'Last place',
    note: 'Pays only if they finish 8th.',
  },
]

const PLACE_TAB_STORAGE = 'tclotBookiePlaceTab.v1'

function SeasonPlaceBoard({ markets, me, onPick, teamLogoMap, kitIndexByEntry }) {
  const available = PLACE_TABS.filter((t) => markets.some((m) => m.kind === t.kind))
  const [tab, setTab] = useState(() => {
    try {
      const stored = sessionStorage.getItem(PLACE_TAB_STORAGE)
      if (PLACE_TABS.some((t) => t.kind === stored)) return stored
    } catch {
      /* private mode */
    }
    return 'outright'
  })

  const resolvedKind = available.some((t) => t.kind === tab) ? tab : available[0]?.kind
  const meta = PLACE_TABS.find((t) => t.kind === resolvedKind)
  const market = markets.find((m) => m.kind === resolvedKind) ?? null

  const selectTab = (kind) => {
    setTab(kind)
    try {
      sessionStorage.setItem(PLACE_TAB_STORAGE, kind)
    } catch {
      /* ignore */
    }
  }

  if (!meta || !market) return null

  const selections = market.payload?.selections ?? []
  const settled = market.status === 'settled'
  const winners = new Set(String(market.result ?? '').split(',').filter(Boolean))

  return (
    <section className="tile tile--compact" aria-label="Season markets">
      <div className="tile-head-row tile-head-row--tight">
        <h3 className="bookie__section-title">{meta.title}</h3>
        <span className="bookie__deadline tabular">
          {settled
            ? 'settled'
            : market.payload?.asOfGw
              ? `priced after GW${market.payload.asOfGw}`
              : 'pre-season prices'}
        </span>
      </div>
      {available.length > 1 ? (
        <div className="subnav bookie-place-nav" role="tablist" aria-label="Season markets">
          {available.map((t) => (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={t.kind === resolvedKind}
              className={'subnav__tab' + (t.kind === resolvedKind ? ' subnav__tab--active' : '')}
              onClick={() => selectTab(t.kind)}
            >
              {t.tab}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="bookie-outright">
        {selections.map((s) => {
          const won = settled && winners.has(String(s.entryId))
          const pct = s.pct ?? s.titlePct
          return (
            <li key={s.entryId} className={'bookie-outright__row' + (won ? ' bookie-outright__row--won' : '')}>
              <span className="bookie-market__team">
                <TeamAvatar
                  entryId={Number(s.entryId)}
                  name={s.name}
                  size="sm"
                  logoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
                <span>{standingsMobileTeamName(s.name)}</span>
                {won ? <span className="bookie-outright__crown" aria-label={meta.crown}>👑</span> : null}
              </span>
              <span className="bookie-outright__pct tabular">{pct}%</span>
              <OddsButton
                label={meta.verb}
                odds={s.odds}
                active={false}
                disabled={!me || settled || !market.open}
                onClick={() =>
                  onPick({
                    marketId: market.id,
                    selection: String(s.entryId),
                    label: meta.slipLabel(standingsMobileTeamName(s.name)),
                    odds: s.odds,
                    detail: meta.detail,
                  })
                }
              />
            </li>
          )
        })}
      </ul>
      <p className="bookie__note bookie__note--small">{meta.note}</p>
    </section>
  )
}

function BetSlip({ slip, me, minStake, token, onClose, onPlaced }) {
  const [stake, setStake] = useState(String(minStake))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const stakeNum = Number(stake)
  const valid = Number.isInteger(stakeNum) && stakeNum >= minStake && stakeNum <= me.balance
  const payout = valid ? Math.round(stakeNum * slip.odds) : null

  const place = async () => {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await placeBookieBet(token, {
        marketId: slip.marketId,
        selection: slip.selection,
        stake: stakeNum,
      })
      onPlaced()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <section className="tile tile--compact bookie-slip" aria-label="Bet slip">
      <div className="tile-head-row tile-head-row--tight">
        <h3 className="bookie__section-title">Bet slip</h3>
        <button type="button" className="bookie-header__logout" onClick={onClose}>
          Cancel
        </button>
      </div>
      <p className="bookie-slip__pick">
        <strong>{slip.label}</strong>
        <span className="bookie-slip__detail"> · {slip.detail}</span>
        <span className="bookie-slip__odds tabular" title={`decimal ${Number(slip.odds).toFixed(2)}`}>
          {' '}@ {fmtOdds(slip.odds)}
        </span>
      </p>
      <div className="bookie-slip__row">
        <label className="bookie-slip__stake-label" htmlFor="bookie-stake">
          Stake
        </label>
        <input
          id="bookie-stake"
          className="bookie-login__pin bookie-slip__stake"
          type="number"
          inputMode="numeric"
          min={minStake}
          max={me.balance}
          step={1}
          value={stake}
          onChange={(e) => setStake(e.target.value)}
        />
        <span className="bookie-slip__payout tabular">
          {payout != null ? `returns ${fmtCoins(payout)}` : `min ${minStake}, max ${fmtCoins(me.balance)}`}
        </span>
        <button
          type="button"
          className="bookie__btn bookie__btn--primary"
          disabled={!valid || busy}
          onClick={place}
        >
          {busy ? 'Placing…' : 'Place bet'}
        </button>
      </div>
      {error ? <p className="bookie__error" role="alert">{error}</p> : null}
    </section>
  )
}

/**
 * The tempter's button: shows the standing offer, arms on the first tap
 * ("sure?"), pays on the second. If the board moves between quote and
 * acceptance the Worker refuses with a fresh number, which is shown
 * instead of silently paying less.
 */
function CashoutButton({ bet, value, token, onCashedOut }) {
  // Parent keys this component by bet id + quoted value, so a fresh quote
  // remounts it — offer/armed/moved never go stale against the prop.
  const [offer, setOffer] = useState(value)
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [moved, setMoved] = useState(false)

  const take = async () => {
    setBusy(true)
    try {
      await cashoutBookieBet(token, { betId: bet.id, quote: offer })
      onCashedOut()
    } catch (e) {
      const fresh = Number(e?.data?.cashOut)
      if (Number.isFinite(fresh) && fresh >= 1) {
        setOffer(fresh)
        setMoved(true)
        setArmed(false)
        setBusy(false)
      } else {
        // Offer gone entirely (settled, suspended) — refresh the whole board.
        onCashedOut()
      }
    }
  }

  return (
    <button
      type="button"
      className={'bookie-bet__cashout' + (armed ? ' bookie-bet__cashout--armed' : '')}
      disabled={busy}
      title="Take the bookie's offer now and settle this ticket early"
      onClick={() => (armed ? take() : setArmed(true))}
    >
      {busy
        ? 'Cashing out…'
        : armed
          ? `Sure? Take ${fmtCoins(offer)}`
          : `${moved ? 'Offer moved — cash' : 'Cash'} out ${fmtCoins(offer)}`}
    </button>
  )
}

/**
 * One ticket's compact description: the pick in bold, then the context —
 * `Gimli (v Bilbo, GW2)`. Full club names live in the hover title.
 */
function BetDesc({ bet, marketById, nameByEntry }) {
  const { pick, detail } = describeBetCompact(bet, marketById, nameByEntry)
  return (
    <span className="bookie-bet__desc" title={describeBet(bet, marketById, nameByEntry)}>
      <strong className="bookie-bet__pick">{pick}</strong> {detail}
    </span>
  )
}

function MyBets({ me, markets, nameByEntry, cashoutQuotes, token, onCashedOut }) {
  const marketById = useMemo(() => {
    const map = new Map()
    for (const m of markets) map.set(Number(m.id), m)
    return map
  }, [markets])
  const bets = me.bets ?? []
  if (bets.length === 0) {
    return (
      <section className="tile tile--compact" aria-label="My bets">
        <h3 className="bookie__section-title">My bets</h3>
        <p className="bookie__note">No tickets yet. Fortune favours the brave.</p>
      </section>
    )
  }
  return (
    <section className="tile tile--compact" aria-label="My bets">
      <h3 className="bookie__section-title">My bets</h3>
      <ul className="bookie-bets">
        <BetColHead />
        {bets.map((b) => {
          const quote = b.status === 'open' ? cashoutQuotes.get(Number(b.id)) : undefined
          return (
            <li key={b.id} className={`bookie-bet bookie-bet--${b.status}`}>
              <BetDesc bet={b} marketById={marketById} nameByEntry={nameByEntry} />
              <BetTicketFigures bet={b} />
              {quote != null && token ? (
                <CashoutButton
                  key={`${b.id}:${quote}`}
                  bet={b}
                  value={quote}
                  token={token}
                  onCashedOut={onCashedOut}
                />
              ) : null}
            </li>
          )
        })}
        <BetTotals bets={bets} />
      </ul>
    </section>
  )
}

/**
 * Everyone's open tickets — the league-wide live board. Tickets were never
 * secret ballots: seeing what your rivals have riding is the point. Grouped
 * per team behind a collapsible row so eight busy punters don't turn the
 * board into a scroll marathon.
 */
function LiveBets({ state, me, markets, nameByEntry, teamLogoMap, kitIndexByEntry }) {
  const marketById = useMemo(() => {
    const map = new Map()
    for (const m of markets) map.set(Number(m.id), m)
    return map
  }, [markets])

  const bets = state.openBets ?? []
  const byEntry = new Map()
  for (const b of bets) {
    const key = Number(b.entry_id)
    if (!byEntry.has(key)) byEntry.set(key, [])
    byEntry.get(key).push(b)
  }
  const groups = [...byEntry.entries()]
    .map(([entryId, rows]) => ({
      entryId,
      name: rows[0]?.name ?? nameByEntry.get(entryId) ?? String(entryId),
      rows,
      staked: rows.reduce((sum, r) => sum + Number(r.stake), 0),
    }))
    .sort((a, b) => b.staked - a.staked)

  return (
    <section className="tile tile--compact" aria-label="Live bets">
      <h3 className="bookie__section-title">Live bets — the whole league</h3>
      {groups.length === 0 ? (
        <p className="bookie__note">
          Nothing riding right now. Someone put their Clotcoins where their mouth is.
        </p>
      ) : (
        <div className="bookie-punters">
          {groups.map((g) => {
            const mine = me && g.entryId === Number(me.entryId)
            return (
              <details
                key={g.entryId}
                className={'bookie-punter' + (mine ? ' bookie-punter--mine' : '')}
              >
                <summary className="bookie-punter__summary">
                  <TeamAvatar
                    entryId={g.entryId}
                    name={g.name}
                    size="sm"
                    logoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                  <span className="bookie-punter__name">
                    {standingsMobileTeamName(g.name)}
                    {mine ? ' (you)' : ''}
                  </span>
                  <span className="bookie-punter__meta tabular">
                    {g.rows.length} {g.rows.length === 1 ? 'bet' : 'bets'} · {fmtCoins(g.staked)} riding
                  </span>
                </summary>
                <ul className="bookie-bets bookie-punter__bets">
                  <BetColHead />
                  {g.rows.map((b) => (
                    <li key={b.id} className="bookie-bet">
                      <BetDesc bet={b} marketById={marketById} nameByEntry={nameByEntry} />
                      <BetTicketFigures bet={b} />
                    </li>
                  ))}
                  <BetTotals bets={g.rows} />
                </ul>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}

function BookieLeaderboards({ state, me, nameByEntry, teamLogoMap, kitIndexByEntry }) {
  const leaderboard = state.leaderboard ?? []

  /** gw → biggest weekly winner (net P/L across that GW's settled bets). */
  const weeklyWinners = useMemo(() => {
    const byGw = new Map()
    for (const row of state.weeklyNet ?? []) {
      const cur = byGw.get(row.gw)
      if (!cur || Number(row.net) > Number(cur.net)) byGw.set(row.gw, row)
    }
    return [...byGw.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([gw, row]) => ({ gw, ...row }))
  }, [state.weeklyNet])

  if (leaderboard.length === 0) {
    return (
      <section className="tile tile--compact" aria-label="Leaderboards">
        <h3 className="bookie__section-title">Bankroll leaderboard</h3>
        <p className="bookie__note">Nobody has claimed a team yet — be the first in the book.</p>
      </section>
    )
  }

  return (
    <section className="tile tile--compact" aria-label="Leaderboards">
      <h3 className="bookie__section-title">Bankroll leaderboard</h3>
      <ol className="bookie-lb">
        {leaderboard.map((u, i) => (
          <li
            key={u.entryId}
            className={
              'bookie-lb__row' + (me && Number(u.entryId) === Number(me.entryId) ? ' bookie-lb__row--me' : '')
            }
          >
            <span className="bookie-lb__rank tabular">{i + 1}</span>
            <span className="bookie-market__team">
              <TeamAvatar
                entryId={Number(u.entryId)}
                name={u.name}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <span>{standingsMobileTeamName(u.name)}</span>
            </span>
            <span className="bookie-lb__balance tabular">{fmtCoins(u.balance)}</span>
          </li>
        ))}
      </ol>
      {weeklyWinners.length > 0 ? (
        <>
          <h3 className="bookie__section-title bookie__section-title--sub">Weekly winners</h3>
          <ul className="bookie-winners">
            {weeklyWinners.map((w) => (
              <li key={w.gw} className="bookie-winners__row">
                <span className="bookie-winners__gw tabular">GW{w.gw}</span>
                <span>
                  {standingsMobileTeamName(nameByEntry.get(Number(w.entryId)) ?? String(w.entryId))}
                </span>
                <span
                  className={
                    'bookie-winners__net tabular ' +
                    (Number(w.net) >= 0 ? 'bookie-winners__net--up' : 'bookie-winners__net--down')
                  }
                >
                  {fmtNet(w.net)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
