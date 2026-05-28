import { useMemo, useState } from 'react';
import { sortStartingXIByPosition } from './liveScoresDerivations.js';
import { REIGNING_CHAMPION_MANAGER_SURNAME } from './championOfRecord.js';
import './GuardOfHonourSplash.css';

/**
 * Per-tab session cap on how many times the entrance cinematic plays back
 * automatically. After the cap is reached the splash still shows, but as a
 * static final-state tableau — the user can still hit Replay manually.
 * Stored under a versioned key so we can bump the cap without colliding with
 * historical values if we ever change the playback budget.
 */
const SESSION_PLAY_KEY = 'tclot:goh:plays:v7';
const SESSION_PLAY_CAP = 3;

/**
 * Top-down 2D match-engine cinematic that plays on the live scores page
 * when the reigning champion's first fixture of the new season is
 * showing. Three-act choreography (see GuardOfHonourSplash.css for the
 * full keyframe timeline):
 *
 *  ACT 1 — Guard of honour forms (≈0–11s)
 *    Blue team enters single-file from off-screen right along the
 *    corridor, then fans out to a 6 × 2 formation either side of the
 *    halfway line — 5 outfielders + the opposition manager (Butcher)
 *    on the top row, 5 outfielders + the opposition keeper on the
 *    bottom row. The clap-wave + on-the-spot bob kicks in at ~8s,
 *    while the LAST few dots are still arriving, so the stadium is
 *    already roaring by the time Higman emerges (rather than waiting
 *    for the full formation to settle before celebrating).
 *
 *  ACT 2 — Higman weaves, champions parade, Higman walks the line
 *          (≈10–38s)
 *    Higman emerges FIRST onto the pitch and runs a zigzag weave
 *    between the two blue rows of the guard. Behind him, the 11
 *    champion starters walk right→left through the corridor and turn
 *    up/down at the left touchline to settle into a VERTICAL line.
 *    Higman finishes his weave by stepping up to the TOP of his own
 *    inspection lane (offset right of the column so he never
 *    overlaps a teammate's dot or label), then walks SLOWLY DOWN the
 *    lane past every teammate, ending below the bottom of the column.
 *
 *  ACT 3 — Pitch invader chased off (≈36–50s)
 *    Motter's Head (pink dot waving two flags) bursts onto the pitch
 *    from the bottom-right while Higman is NEAR THE END of his
 *    inspection walk (~y=480, last teammate row). He sprints toward
 *    the centre of the guard, then two black security dots enter from
 *    the SAME direction he came from (bottom-right) — pursuing him —
 *    catch up shoulder-to-shoulder, and chase the whole bundle off
 *    the right edge of the pitch together.
 *
 * The cinematic auto-plays up to SESSION_PLAY_CAP times per browser
 * tab, with manual Replay always available, and respects
 * `prefers-reduced-motion: reduce` by snapping to the final-state
 * tableau (blue in formation, red lined up on the left, no streaker).
 *
 * Used in production when GW === 1 of a new season; previewable any
 * time via the `?gohSplash=1` URL flag. The visual is rendered as a
 * single inline SVG so it scales cleanly without a PNG asset and so we
 * can data-drive labels (real surnames + shirt numbers) from squad
 * payloads.
 *
 * @param {{
 *   championStarters: Array<{ element: number, displayName?: string, web_name?: string, posSingular?: string, total_points?: number, pickPosition?: number }>,
 *   opponentStarters: Array<{ element: number, displayName?: string, web_name?: string, posSingular?: string, total_points?: number, pickPosition?: number }>,
 *   championTeamName?: string,
 *   opponentTeamName?: string,
 *   opponentManagerSurname?: string | null,
 *   onDismiss?: () => void,
 * }} props
 */
export function GuardOfHonourSplash({
  championStarters,
  opponentStarters,
  championTeamName,
  opponentTeamName,
  opponentManagerSurname,
  onDismiss,
}) {
  /**
   * Both XIs are sorted GK → DEF → MID → FWD so the dot ordering is
   * deterministic and matches the order users already see in the expanded
   * fixture table. The first sorted entry is therefore the GK, which is the
   * one we place near the bottom goal for the opponent tunnel.
   */
  const championXi = useMemo(
    () => sortStartingXIByPosition(championStarters ?? []),
    [championStarters],
  );
  const opponentXi = useMemo(
    () => sortStartingXIByPosition(opponentStarters ?? []),
    [opponentStarters],
  );

  /**
   * Playback state machine. On first mount we consult sessionStorage to see
   * how many times the entrance cinematic has already played this tab — if
   * we're still under the cap we increment and assign a non-zero `playId`
   * (which becomes the SVG element's React `key`, forcing a fresh mount and
   * therefore a fresh run of every CSS animation). Manual Replay clicks
   * always bump `playId` regardless of the session cap so the user can
   * always re-watch on demand.
   *
   * Lazy initial state keeps the storage read out of the render path on
   * every re-render; the bookkeeping happens exactly once per component
   * instance.
   */
  const [playId, setPlayId] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const n = Number(window.sessionStorage.getItem(SESSION_PLAY_KEY) ?? '0');
      if (!Number.isFinite(n) || n >= SESSION_PLAY_CAP) return 0;
      window.sessionStorage.setItem(SESSION_PLAY_KEY, String(n + 1));
      return n + 1;
    } catch {
      return 1;
    }
  });
  const isPlaying = playId > 0;
  const handleReplay = () => setPlayId((id) => id + 1);

  /**
   * If either side has fewer than 11 starters (data not yet loaded, blank
   * GW, etc.) we render nothing rather than show a half-formed tunnel.
   */
  if (championXi.length < 11 || opponentXi.length < 11) return null;

  const opponentGk = opponentXi[0];

  /**
   * Champion conga: the manager leads at the FRONT (position 0 in our
   * rendered list, lowest cy in the pitch — closest to the bottom goal)
   * and the rest of the XI trails behind upward. We render `championXi`
   * in front-to-back order so index 0 is the lead player just behind
   * Higman, and the manager dot is rendered separately below the conga.
   */
  return (
    <div
      className={`goh-splash${isPlaying ? ' goh-splash--playing' : ''}`}
      role="region"
      aria-label={`Guard of honour for ${championTeamName ?? 'the reigning champion'}`}
    >
      <button
        type="button"
        className="goh-splash__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss guard of honour"
      >
        <span className="goh-splash__dismiss-x" aria-hidden="true">×</span>
      </button>

      <button
        type="button"
        className="goh-splash__replay"
        onClick={handleReplay}
        aria-label="Replay guard of honour animation"
      >
        <span className="goh-splash__replay-icon" aria-hidden="true">↻</span>
      </button>

      <svg
        key={playId}
        className="goh-splash__svg"
        viewBox="0 0 1024 576"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Top-down match engine view: ${opponentTeamName ?? 'the opponent'} forms a guard of honour for ${championTeamName ?? 'the champion'}, with manager Higman leading the procession.`}
      >
        <defs>
          <linearGradient id="goh-pitch-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a6f3a" />
            <stop offset="100%" stopColor="#2f5e2f" />
          </linearGradient>

          {/* Pitch surface mowing pattern. Stripes run VERTICALLY so they
              read as perpendicular to the new horizontal length axis
              (left goal → right goal). Pattern repeats every 96 viewBox
              units across the width — same stripe pitch the old
              horizontal-bands version used, just rotated 90°. */}
          <pattern id="goh-pitch-stripes" width="96" height="576" patternUnits="userSpaceOnUse">
            <rect width="96" height="576" fill="url(#goh-pitch-grad)" />
            <rect x="48" width="48" height="576" fill="#000" opacity="0.08" />
          </pattern>

          <radialGradient id="goh-centre-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd166" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#ffd166" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffd166" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="goh-opp-fill" cx="35%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#4f99ff" />
            <stop offset="100%" stopColor="#1f4fd9" />
          </radialGradient>

          <radialGradient id="goh-champ-fill" cx="35%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#ff5a5a" />
            <stop offset="100%" stopColor="#c81f1f" />
          </radialGradient>

          <radialGradient id="goh-higman-fill" cx="35%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#ff7878" />
            <stop offset="100%" stopColor="#b81818" />
          </radialGradient>
        </defs>

        {/* Pitch surface ------------------------------------------------ */}
        <g className="goh-splash__pitch">
          <rect width="1024" height="576" fill="url(#goh-pitch-stripes)" />

          {/* Pitch markings (white). All vector-rendered so they stay crisp
              at any banner width. Strokes use vector-effect: non-scaling so
              the lines don't get chunky on wide displays.
              ORIENTATION: goals are on the LEFT and RIGHT (length axis
              horizontal), halfway line is VERTICAL through x=512, and
              penalty / 6-yard boxes hang off each goal — so the pitch
              reads as "long and thin" left-to-right. */}
          <g stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.85" vectorEffect="non-scaling-stroke">
            <rect x="16" y="16" width="992" height="544" />
            <line x1="512" y1="16" x2="512" y2="560" />
            <circle cx="512" cy="288" r="64" />
            <circle cx="512" cy="288" r="2.5" fill="#ffffff" stroke="none" />
            <rect x="16" y="116" width="116" height="344" />
            <rect x="16" y="204" width="52" height="168" />
            <rect x="892" y="116" width="116" height="344" />
            <rect x="956" y="204" width="52" height="168" />
          </g>

          {/* Goals (left + right). Subtle white strip outside the pitch
              line, centred vertically on the goal-line midpoint. */}
          <rect x="6" y="252" width="10" height="72" fill="#ffffff" opacity="0.85" />
          <rect x="1008" y="252" width="10" height="72" fill="#ffffff" opacity="0.85" />
        </g>

        {/* Centrepiece: trophy outline (more faded) + crown overlaid.
            Repositioned above the corridor in the upper third so it
            stays unobscured while the conga walks along the halfway line.
            Wrapped in a group so the entrance fade + idle swell can be
            applied as a single animation target. */}
        <g className="goh-splash__centre">
          <circle cx={CENTRE_X} cy={CENTRE_Y} r="70" fill="url(#goh-centre-glow)" />
          <TrophyOutlineSvg cx={CENTRE_X} cy={CENTRE_Y + 12} scale={0.78} opacity={0.22} />
          <CrownSvg cx={CENTRE_X} cy={CENTRE_Y - 6} scale={0.95} opacity={0.5} fill="#ffd166" />
        </g>

        {/* Opponent top line (blue) — 5 outfield dots ------------------
            Each dot's wrapper carries:
              --i           : 0..4 stagger index (controls entrance &
                              clap-wave phase offsets in CSS),
              --enter-dx/dy : the per-dot offset from the off-screen
                              entry point (ENTRY_X, ENTRY_Y) to the
                              dot's FINAL formation position. The CSS
                              animation simply translates from those
                              offsets back to (0, 0).
            An inner `__opp-bob` wrapper carries the perpetual
            jump-on-the-spot celebration so the outer entrance translate
            and inner bob translate don't clobber each other. Chevron is
            positioned BELOW each dot pointing down; label sits above
            the dot so it doesn't crash into the chevron. */}
        {/*
          Top row (blue) — 5 outfield dots + opposition manager (Butcher)
          at the right end (entry side of the corridor). Butcher carries
          `number={null}` so PlayerDot omits the shirt-number text;
          everything else (fill, chevron, label-side) matches the
          outfielders for visual consistency.
        */}
        {[
          ...opponentXi.slice(1, 6).map((p, i) => ({
            key: `opp-top-${p.element}`,
            cx: OPP_LINE_X[i],
            number: i + 2,
            label: surnameOf(p),
          })),
          {
            key: 'opp-top-butcher',
            cx: OPP_LINE_X[5],
            number: null,
            label: opponentManagerSurname ?? 'Butcher',
          },
        ].map((m, i) => (
          <g
            key={m.key}
            className="goh-splash__opp-top"
            style={{
              '--i': i,
              '--enter-dx': `${ENTRY_X - m.cx}px`,
              '--enter-dy': `${ENTRY_Y - OPP_TOP_Y}px`,
            }}
          >
            <g className="goh-splash__opp-bob">
              <PlayerDot
                cx={m.cx}
                cy={OPP_TOP_Y}
                r={DOT_R}
                fillUrl="url(#goh-opp-fill)"
                number={m.number}
                label={m.label}
                chevronDir="down"
                labelSide="above"
              />
            </g>
          </g>
        ))}

        {/*
          Bottom row (blue) — 5 outfield dots + opposition GK at the
          right end (matching Butcher's position above). The GK keeps
          his #1 shirt number to make the line look like a real team
          formation greeting the champions.
        */}
        {[
          ...opponentXi.slice(6, 11).map((p, i) => ({
            key: `opp-bot-${p.element}`,
            cx: OPP_LINE_X[i],
            number: i + 7,
            label: surnameOf(p),
          })),
          opponentGk
            ? {
                key: `opp-bot-gk-${opponentGk.element}`,
                cx: OPP_LINE_X[5],
                number: 1,
                label: surnameOf(opponentGk),
              }
            : null,
        ]
          .filter(Boolean)
          .map((m, i) => (
            <g
              key={m.key}
              className="goh-splash__opp-bot"
              style={{
                '--i': i,
                '--enter-dx': `${ENTRY_X - m.cx}px`,
                '--enter-dy': `${ENTRY_Y - OPP_BOTTOM_Y}px`,
              }}
            >
              <g className="goh-splash__opp-bob">
                <PlayerDot
                  cx={m.cx}
                  cy={OPP_BOTTOM_Y}
                  r={DOT_R}
                  fillUrl="url(#goh-opp-fill)"
                  number={m.number}
                  label={m.label}
                  chevronDir="up"
                />
              </g>
            </g>
          ))}

        {/* Champion conga (red) — 11 starters walking through the
            corridor and finishing in a VERTICAL line on the left
            touchline. Each dot's FINAL render position is
            (RED_LINE_X, redLineY(i)). The CSS keyframe path takes the
            dot from off-screen-right through the corridor (waypoint at
            the left touchline still at corridor y) and then up/down to
            its slot in the column.
              --enter-dx : ENTRY_X − final_cx (constant 1145 here, since
                           every red dot ends at the same x)
              --enter-dy : ENTRY_Y − final_cy (varies per dot — the
                           amount of vertical travel each dot has to do
                           after the corridor traverse)
            `labelSide="right"` puts surnames in a tidy column beside
            the dots instead of vertically stacked, which would collide
            with neighbours at the 42-unit row spacing. */}
        {championXi.map((p, i) => {
          const finalY = redLineY(i);
          return (
            <g
              key={`champ-${p.element}`}
              className="goh-splash__conga-slot"
              style={{
                '--i': i,
                '--enter-dx': `${ENTRY_X - RED_LINE_X}px`,
                '--enter-dy': `${ENTRY_Y - finalY}px`,
              }}
            >
              <PlayerDot
                cx={RED_LINE_X}
                cy={finalY}
                r={DOT_R_CONGA}
                fillUrl="url(#goh-champ-fill)"
                number={(i % 11) + 1}
                label={surnameOf(p)}
                labelSide="right"
              />
            </g>
          );
        })}

        {/* Higman — emerges FIRST onto the pitch (just as the blue
            guard is settling), weaves between the two blue lines, and
            then walks SLOWLY DOWN his own inspection lane (to the
            right of the conga column) past every teammate. Final SVG
            render position is the BOTTOM of that lane; CSS keyframes
            (see `goh-higman-weave` in GuardOfHonourSplash.css) drive
            him through:
              0%   off-screen right at corridor y
              3%   appears (opacity 1)
              18%  W1 — top row near right end (~x=800, y=180)
              35%  W2 — bottom row near centre (~x=540, y=400)
              52%  W3 — top row near left (~x=260, y=180)
              65%  W4 — TOP of inspection lane (HIGMAN_LANE_X, top)
              100% BOTTOM of inspection lane (final)
            Each waypoint is passed as a CSS variable expressing the
            offset from (HIGMAN_FINAL_X, HIGMAN_FINAL_Y), matching the
            convention used by every other dot's translate.
            The visual treatment is intentionally minimal: Higman is
            the SAME size as a conga teammate (DOT_R_CONGA) — only the
            gold ring around him and the crown glyph distinguish him.
            No side-glow ellipse, no oversized halo. The ring sits on
            top of his dot and carries the gentle pulse animation.
            Label lives outside the `__higman-bob` wrapper so the
            surname stays anchored while Higman bobs as he walks. */}
        <g
          className="goh-splash__higman"
          style={{
            '--enter-dx': `${ENTRY_X - HIGMAN_FINAL_X}px`,
            '--enter-dy': `${ENTRY_Y - HIGMAN_FINAL_Y}px`,
            '--w1-dx': `${HIGMAN_W1_X - HIGMAN_FINAL_X}px`,
            '--w1-dy': `${HIGMAN_W1_Y - HIGMAN_FINAL_Y}px`,
            '--w2-dx': `${HIGMAN_W2_X - HIGMAN_FINAL_X}px`,
            '--w2-dy': `${HIGMAN_W2_Y - HIGMAN_FINAL_Y}px`,
            '--w3-dx': `${HIGMAN_W3_X - HIGMAN_FINAL_X}px`,
            '--w3-dy': `${HIGMAN_W3_Y - HIGMAN_FINAL_Y}px`,
            '--w4-dx': `${HIGMAN_W4_X - HIGMAN_FINAL_X}px`,
            '--w4-dy': `${HIGMAN_W4_Y - HIGMAN_FINAL_Y}px`,
          }}
        >
          <g className="goh-splash__higman-bob">
            <circle
              cx={HIGMAN_FINAL_X}
              cy={HIGMAN_FINAL_Y}
              r={DOT_R_HIGMAN}
              fill="url(#goh-higman-fill)"
            />
            {/* Gold ring — distinguishes Higman as the champion
                manager without changing his footprint. Stroke-only
                circle just outside the dot, with the pulse animation
                modulating its opacity for a subtle champion's glow. */}
            <circle
              cx={HIGMAN_FINAL_X}
              cy={HIGMAN_FINAL_Y}
              r={DOT_R_HIGMAN_HALO}
              fill="none"
              stroke="#ffd166"
              strokeWidth="2.5"
              className="goh-splash__higman-glow"
            />
            <CrownSvg
              cx={HIGMAN_FINAL_X}
              cy={HIGMAN_FINAL_Y - 1}
              scale={0.34}
              opacity={1}
              fill="#ffffff"
            />
          </g>
          <text
            x={HIGMAN_FINAL_X + DOT_R_HIGMAN_HALO + 4}
            y={HIGMAN_FINAL_Y + 4}
            textAnchor="start"
            className="goh-splash__label goh-splash__label--higman"
          >
            {REIGNING_CHAMPION_MANAGER_SURNAME}
          </text>
        </g>

        {/* Streaker — "Motter's Head". Pink dot with two waving flags
            and a bobbing run. Renders at its FINAL on-pitch position
            (mid-corridor) inside an inner translated group so the
            outer wrapper can carry the entrance + capture-drag-off
            animations cleanly without the SVG `transform` attribute
            fighting the CSS keyframe transforms.
              --enter-dx/dy : from off-screen bottom-right to centre
              --exit-dx     : from centre to off-screen right (the
                              dragged-off motion).
            The `__streaker-bob` wrapper handles the perpetual running
            bounce; each `__streaker-flag-spin` wrapper rotates a flag
            around its mast for the wave effect. */}
        <g
          className="goh-splash__streaker"
          style={{
            '--enter-dx': `${STREAKER_ENTRY_X - STREAKER_FINAL_X}px`,
            '--enter-dy': `${STREAKER_ENTRY_Y - STREAKER_FINAL_Y}px`,
            '--exit-dx': `${EXIT_X - STREAKER_FINAL_X}px`,
          }}
        >
          <g transform={`translate(${STREAKER_FINAL_X} ${STREAKER_FINAL_Y})`}>
            <g className="goh-splash__streaker-bob">
              <circle
                cx="0"
                cy="0"
                r={DOT_R_STREAKER}
                fill="#ff66cc"
                stroke="#0a0a0a"
                strokeOpacity="0.4"
                strokeWidth="1"
              />
              <circle cx="0" cy={-DOT_R_STREAKER * 0.4} r={DOT_R_STREAKER * 0.55} fill="#ffffff" opacity="0.18" />
              {/* Left flag — pole extends UP from the streaker's left
                  hand (just outside the body at -9, -2), flag triangle
                  at the top pointing further left. Rotation pivots at
                  the hand so the whole mast + flag swing through an
                  arc when the wave keyframes run. */}
              <g className="goh-splash__streaker-flag goh-splash__streaker-flag--left" transform="translate(-9 -2)">
                <g className="goh-splash__streaker-flag-spin">
                  <line x1="0" y1="0" x2="0" y2="-16" stroke="#ffffff" strokeWidth="1.5" />
                  <polygon points="0,-16 -10,-13 -10,-8" fill="#ff66cc" stroke="#ffffff" strokeWidth="0.8" />
                </g>
              </g>
              {/* Right flag — mirror image of the left flag, mast up
                  from the streaker's right hand, triangle pointing
                  right. Phase is offset from the left so the pair
                  reads as a frantic semaphore not a synchronised pair. */}
              <g className="goh-splash__streaker-flag goh-splash__streaker-flag--right" transform="translate(9 -2)">
                <g className="goh-splash__streaker-flag-spin">
                  <line x1="0" y1="0" x2="0" y2="-16" stroke="#ffffff" strokeWidth="1.5" />
                  <polygon points="0,-16 10,-13 10,-8" fill="#ff66cc" stroke="#ffffff" strokeWidth="0.8" />
                </g>
              </g>
            </g>
            <text
              x="0"
              y={DOT_R_STREAKER + 14}
              textAnchor="middle"
              className="goh-splash__label goh-splash__label--streaker"
            >
              {"Motter's Head"}
            </text>
          </g>
        </g>

        {/* Security guard #1 — enters from off-screen right just above
            the corridor, grabs the streaker from his left side, and
            drags off-screen right with the bundle. */}
        <g
          className="goh-splash__security goh-splash__security--top"
          style={{
            '--enter-dx': `${SECURITY_ENTRY_X - SECURITY1_GRAB_X}px`,
            '--enter-dy': `${SECURITY1_ENTRY_Y - SECURITY_GRAB_Y}px`,
            '--exit-dx': `${EXIT_X - SECURITY1_GRAB_X}px`,
          }}
        >
          <circle
            cx={SECURITY1_GRAB_X}
            cy={SECURITY_GRAB_Y}
            r={DOT_R_SECURITY}
            fill="#1a1a1a"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          <circle
            cx={SECURITY1_GRAB_X}
            cy={SECURITY_GRAB_Y - DOT_R_SECURITY * 0.35}
            r={DOT_R_SECURITY * 0.5}
            fill="#ffffff"
            opacity="0.12"
          />
        </g>

        {/* Security guard #2 — enters from off-screen right just below
            the corridor, grabs the streaker from his right side, and
            drags off with #1. */}
        <g
          className="goh-splash__security goh-splash__security--bot"
          style={{
            '--enter-dx': `${SECURITY_ENTRY_X - SECURITY2_GRAB_X}px`,
            '--enter-dy': `${SECURITY2_ENTRY_Y - SECURITY_GRAB_Y}px`,
            '--exit-dx': `${EXIT_X - SECURITY2_GRAB_X}px`,
          }}
        >
          <circle
            cx={SECURITY2_GRAB_X}
            cy={SECURITY_GRAB_Y}
            r={DOT_R_SECURITY}
            fill="#1a1a1a"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          <circle
            cx={SECURITY2_GRAB_X}
            cy={SECURITY_GRAB_Y - DOT_R_SECURITY * 0.35}
            r={DOT_R_SECURITY * 0.5}
            fill="#ffffff"
            opacity="0.12"
          />
        </g>

      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout constants — single source of truth for the v5 cinematic.
 *
 * Geometry summary (all in 1024×576 viewBox units):
 *   - Blue team's GUARD OF HONOUR — 12 dots total: 10 outfielders
 *     + the opposition GK + opposition manager Butcher, split as
 *     6 across the top row and 6 across the bottom row.
 *   - Higman emerges FIRST onto the pitch and weaves between the
 *     two blue lines (right→top→bottom→top→bottom→left touchline)
 *     before climbing to the top of the vertical line.
 *   - Right behind Higman, the CONGA of 11 champion starters walks
 *     through the corridor and stacks into the vertical line on the
 *     left touchline. Higman settles at the TOP of the line (the
 *     back of the procession) last.
 *   - Streaker ("Motter's Head", pink, with two waving flags) bursts
 *     onto the pitch from the bottom-right corner just as the conga
 *     finishes, runs to the corridor centre.
 *   - Two black security dots converge on the streaker from the
 *     off-screen-right side and drag him off-screen right.
 *                                                                     */
/* ------------------------------------------------------------------ */

/** Dot radii. Higman matches `DOT_R_CONGA` — he's not visually bigger
 * than his teammates, just distinguished by the gold ring + crown
 * glyph on top of his dot. Guard-of-honour dots (including the blue
 * GK and Butcher who now stand IN the line, not at the goalmouth /
 * centre) all share `DOT_R` so the rows read uniformly. */
const DOT_R = 17;
const DOT_R_CONGA = 14;
const DOT_R_HIGMAN = DOT_R_CONGA;
const DOT_R_HIGMAN_HALO = DOT_R_CONGA + 4;
const DOT_R_STREAKER = 13;
const DOT_R_SECURITY = 14;

/** Horizontal corridor — the "tunnel" between the two blue lines. The
 * red team walks left along this line before fanning out to the left
 * vertical formation. */
const CORRIDOR_Y = 290;

/** Top and bottom opponent line y centres, evenly spaced either side of
 * the corridor. */
const OPP_TOP_Y = 180;
const OPP_BOTTOM_Y = 400;

/** Six guard-line x centres for each row. The last column (920) is
 * where Butcher (top row) and the opposition GK (bottom row) stand
 * — at the entry side of the corridor, so they're the first to greet
 * the champions walking through. */
const OPP_LINE_X = [220, 360, 500, 640, 780, 920];

/** Red team's FINAL formation — a vertical line on the left touchline.
 * The 11 starters stack at `RED_LINE_SPACING` intervals from
 * `RED_LINE_TOP_Y` down. Higman walks a separate lane to the right of
 * the column (see `HIGMAN_LANE_X`) so he never sits on top of one of
 * his teammates as he inspects the line.
 *
 * `HIGMAN_LANE_X` is far enough right that:
 *   - it clears the conga DOTS (centred at `RED_LINE_X`, r = 14, so
 *     extending to x = 69), and
 *   - it clears the conga LABELS (anchored at `RED_LINE_X` + r + 5
 *     = 74, extending right ~60px to ~134 in the worst case),
 * so Higman never overlaps a teammate's dot or surname even as he
 * walks slowly down the line. */
const RED_LINE_X = 55;
const RED_LINE_TOP_Y = 60;
const RED_LINE_SPACING = 42;
const HIGMAN_LANE_X = 160;
/** Top of Higman's inspection lane — aligned with the top of the conga
 * column so the start of his walk-down lines up with the first
 * teammate's row. */
const HIGMAN_LANE_TOP_Y = RED_LINE_TOP_Y;
/** Bottom of the inspection lane — past the last conga slot so Higman
 * visually finishes BELOW the line he just inspected. */
const HIGMAN_LANE_BOTTOM_Y = 522;
const HIGMAN_FINAL_X = HIGMAN_LANE_X;
const HIGMAN_FINAL_Y = HIGMAN_LANE_BOTTOM_Y;

/** Y for the i-th conga starter in the final vertical line (i = 0..10).
 * Index 0 sits at the top of the column; index 10 is the tail of the
 * procession just above where Higman ends his walk-down. */
function redLineY(i) {
  return RED_LINE_TOP_Y + i * RED_LINE_SPACING;
}

/** Off-screen entry point — both teams enter from the right touchline
 * along the corridor. The entry x is well past the right edge of the
 * SVG viewBox so dots are reliably clipped during their "off-screen
 * waiting" portion of the timeline. */
const ENTRY_X = 1200;
const ENTRY_Y = CORRIDOR_Y;

/** Higman waypoints — five intermediate stops between off-screen entry
 * (right of the pitch) and his final spot at the bottom of the
 * inspection lane.
 *
 *   W1 / W3 : top row of the blue guard near the right / left end
 *             — Higman pops up above the corridor.
 *   W2      : bottom row near centre — Higman dips below the corridor.
 *   W4      : top of his own inspection lane, level with conga[0].
 *             From here he walks STRAIGHT DOWN the lane past every
 *             teammate until he arrives at the lane bottom (FINAL).
 *
 * These are absolute SVG positions; the JSX converts each to a
 * (waypoint − final) offset that the CSS keyframe consumes as a
 * translate, mirroring the entry-offset convention used for every
 * other dot. */
const HIGMAN_W1_X = 800;
const HIGMAN_W1_Y = OPP_TOP_Y;
const HIGMAN_W2_X = 540;
const HIGMAN_W2_Y = OPP_BOTTOM_Y;
const HIGMAN_W3_X = 260;
const HIGMAN_W3_Y = OPP_TOP_Y;
const HIGMAN_W4_X = HIGMAN_LANE_X;
const HIGMAN_W4_Y = HIGMAN_LANE_TOP_Y;

/** Streaker — "Motter's Head". Enters from off-screen bottom-right at a
 * diagonal, ends up at the corridor halfway between the blue lines
 * (i.e. the centre of the guard of honour). */
const STREAKER_ENTRY_X = 1100;
const STREAKER_ENTRY_Y = 650;
const STREAKER_FINAL_X = 512;
const STREAKER_FINAL_Y = CORRIDOR_Y;

/** Exit point — both the streaker and the two security guards are
 * dragged off-screen to the right together. */
const EXIT_X = 1300;
const EXIT_Y = CORRIDOR_Y;

/** Security guards — chase the streaker. Both enter from the SAME
 * off-screen direction the streaker came in from (bottom-right of the
 * pitch), so they read as pursuing him from the start rather than
 * appearing from elsewhere to ambush.
 *
 * Entry y-values straddle the streaker's diagonal so the two dots
 * look like a pair of pursuers — one cutting in slightly higher, one
 * slightly lower — rather than a single column behind him. Entry x is
 * pulled in from off-screen far-right (1200 → 1100) so they enter
 * close enough to actually look like pursuit rather than a far-off
 * convergence.
 *
 * Grab positions sit tight to the streaker (22px on each side, was
 * 30px) so once they catch up they're shoulder-to-shoulder with him
 * for the chase off-screen. */
const SECURITY_ENTRY_X = 1100;
const SECURITY1_ENTRY_Y = 600;
const SECURITY2_ENTRY_Y = 700;
const SECURITY1_GRAB_X = STREAKER_FINAL_X - 22;
const SECURITY2_GRAB_X = STREAKER_FINAL_X + 22;
const SECURITY_GRAB_Y = CORRIDOR_Y;

/** Centrepiece (crown + trophy outline) — above the corridor in the
 * upper third so the procession doesn't occlude it. */
const CENTRE_X = 512;
const CENTRE_Y = 110;

/** Pull the FPL `web_name` (or `displayName` fallback) for the label. */
function surnameOf(row) {
  const raw =
    row?.displayName ??
    row?.web_name ??
    (row?.element != null ? `#${row.element}` : '?');
  return shortenSurname(raw);
}

/**
 * Surnames longer than ~10 characters collide with neighbours at the tight
 * 36px conga spacing (even with the alternating above/below labelling).
 * Shorten such names to initials when the surname has multiple tokens
 * (hyphen / space): `Calvert-Lewin` → `C.L.`, `Mac Allister` → `M.A.`,
 * `Lewis-Skelly` → `L.S.`. For long single-token surnames we fall back
 * to a 7-character truncation with a period (`Arrizabalaga` → `Arrizab.`)
 * so the dot still has SOME identifying label rather than a single letter.
 *
 * Short names pass through untouched.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
function shortenSurname(name) {
  const s = String(name ?? '').trim();
  if (!s || s.length <= 10) return s;
  const tokens = s.split(/[\s-]+/).filter((t) => t.length > 0);
  if (tokens.length > 1) {
    return tokens.map((t) => t[0].toUpperCase()).join('.') + '.';
  }
  return s.slice(0, 7) + '.';
}

/* ------------------------------------------------------------------ */
/* Small SVG sub-components — colocated to keep the file self-contained.
 * Each is a pure function of its props; no state, no effects.         */
/* ------------------------------------------------------------------ */

/**
 * A single player dot — coloured circle with a white shirt number and a
 * thin white surname label. Optional inward-pointing clap chevron is
 * auto-placed on the opposite side of the dot to its gesture direction
 * (e.g. `chevronDir="down"` puts a downward-pointing chevron just below
 * the dot — the bow toward the corridor below).
 *
 * `labelSide` controls where the surname renders relative to the dot:
 *   - `above` / `below` (default): vertically stacked, text-anchored
 *     middle. Used by the blue tunnel and any horizontal layout.
 *   - `right` / `left`: horizontally offset, text-anchored start / end.
 *     Used by the red team's vertical left-touchline line-up so the
 *     surnames sit in a tidy column beside the dots without the
 *     vertically-stacked labels colliding with neighbours.
 */
function PlayerDot({ cx, cy, r, fillUrl, number, label, chevronDir, labelSide = 'below' }) {
  const chevronPos = chevronDir ? chevronOffsetFor(cx, cy, r, chevronDir) : null;

  let labelX = cx;
  let labelY;
  let textAnchor = 'middle';
  if (labelSide === 'above') {
    labelY = cy - r - 6;
  } else if (labelSide === 'right') {
    labelX = cx + r + 5;
    labelY = cy + 3;
    textAnchor = 'start';
  } else if (labelSide === 'left') {
    labelX = cx - r - 5;
    labelY = cy + 3;
    textAnchor = 'end';
  } else {
    labelY = cy + r + 12;
  }

  return (
    <g>
      {chevronPos ? <ClapChevron cx={chevronPos.cx} cy={chevronPos.cy} dir={chevronDir} /> : null}
      <circle cx={cx} cy={cy} r={r} fill={fillUrl} stroke="#0a0a0a" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx={cx} cy={cy - r * 0.35} r={r * 0.55} fill="#ffffff" opacity="0.08" />
      {number != null ? (
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="goh-splash__num">
          {number}
        </text>
      ) : null}
      <text x={labelX} y={labelY} textAnchor={textAnchor} className="goh-splash__label">
        {label}
      </text>
    </g>
  );
}

/**
 * Position the clap chevron on the side of the dot that matches its
 * gesture direction. Returns the centre coordinates of the chevron — the
 * SVG path itself is drawn at the origin and rotated inside `ClapChevron`.
 */
function chevronOffsetFor(cx, cy, r, dir) {
  const off = r + 8;
  if (dir === 'down') return { cx, cy: cy + off };
  if (dir === 'up') return { cx, cy: cy - off };
  if (dir === 'right') return { cx: cx + off, cy };
  if (dir === 'left') return { cx: cx - off, cy };
  return { cx, cy: cy - off };
}

/**
 * Tiny inward-pointing chevron — the bow / clap gesture cue for the
 * guard-of-honour formation. The path is drawn as a `^` pointing up at
 * the origin and rotated to face the requested direction (SVG rotates
 * clockwise: 90 → right, 180 → down, -90 → left).
 */
function ClapChevron({ cx, cy, dir }) {
  const rotate =
    dir === 'right' ? 90 : dir === 'down' ? 180 : dir === 'left' ? -90 : 0;
  return (
    <g
      className="goh-clap-chevron"
      transform={`translate(${cx} ${cy}) rotate(${rotate})`}
      opacity="0.85"
    >
      <path
        d="M -7 4 L 0 -4 L 7 4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * Stylised crown glyph (5 points, rounded base). Used twice: large + faint
 * in the centre circle as the ceremonial centrepiece, and small + solid
 * inside Higman's dot in place of a shirt number.
 */
function CrownSvg({ cx, cy, scale, opacity = 1, fill = '#ffd166' }) {
  const d = `
    M -28 8
    L -28 -8
    L -16 4
    L -8 -16
    L 0 6
    L 8 -16
    L 16 4
    L 28 -8
    L 28 8
    Z
    M -30 10
    L 30 10
    L 30 16
    L -30 16
    Z
  `;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} opacity={opacity}>
      <path d={d} fill={fill} />
    </g>
  );
}

/**
 * Faint trophy outline, used behind the centre-circle crown to layer the
 * ceremonial centrepiece. Just a chalice shape with handles, no detail.
 */
function TrophyOutlineSvg({ cx, cy, scale, opacity }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} opacity={opacity}>
      <path
        d="M -22 -34 L 22 -34 L 22 -18 C 22 0 14 14 0 18 C -14 14 -22 0 -22 -18 Z"
        fill="none"
        stroke="#ffd166"
        strokeWidth="3"
      />
      <path
        d="M -22 -28 C -34 -28 -36 -16 -28 -10 M 22 -28 C 34 -28 36 -16 28 -10"
        fill="none"
        stroke="#ffd166"
        strokeWidth="3"
      />
      <rect x="-8" y="18" width="16" height="8" fill="none" stroke="#ffd166" strokeWidth="3" />
      <rect x="-18" y="26" width="36" height="6" fill="none" stroke="#ffd166" strokeWidth="3" />
    </g>
  );
}

