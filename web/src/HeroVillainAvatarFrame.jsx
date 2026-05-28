const HERO_VILLAIN_LABEL = {
  hero: 'HERO DEFEAT',
  villain: 'VILLAIN VICTORY',
};

const HERO_VILLAIN_ARIA = {
  hero: 'Hero defeat: 2nd-highest raw gameweek score in the league but losing this head-to-head on live points',
  villain: 'Villain detected: winning this head-to-head gameweek on live points while ranked 7th in the league for raw gameweek total',
};

/**
 * Hero / villain narrative wrapper around an avatar — locked mockup Variant 1
 * (see `Mockup.jsx` HERO/VILLAIN BADGE showcase + DECISIONS tracker). Applied
 * consistently across every production surface that previously rendered the
 * rectangular HERO DEFEAT / VILLAIN VICTORY tile.
 *
 * Size variants (different host contexts have different vertical/horizontal
 * room — the avatar treatment compresses accordingly):
 *
 *  - `default`: 2px tinted ring around the avatar + caption pill rendered in
 *    a slot below the avatar. The emoji badge dot was removed (round 3
 *    follow-up) — the pill wording alone carries the narrative and the dot
 *    pushed alignment on tight crest columns. The caller controls whether
 *    the caption slot occupies space via `captionSlotVisible` (so both
 *    sides of a face-off can reserve the slot even when only one side
 *    has a status, keeping avatars Y-aligned).
 *
 *  - `compact`: 2px tinted ring only, NO caption slot rendered. Used in
 *    `live-squad-tile` heads where the team name immediately follows the
 *    avatar and already serves as a caption.
 *
 *  - `tiny`: 2px tinted ring only — no dot, no caption. Used in the Live
 *    Table standings row where the cell is tight. Tinted row background and
 *    the wrapper's `aria-label` (also surfaced as `title`) provide affordance.
 *
 * If `status` is nullish the wrapper renders the avatar untreated (no ring,
 * no dot, no caption) and the slot is still reserved when
 * `captionSlotVisible` is true (so a sibling side carrying a status doesn't
 * push this side's avatar out of vertical alignment).
 *
 * @param {{
 *   status: 'hero' | 'villain' | null | undefined,
 *   size?: 'default' | 'compact' | 'tiny',
 *   captionSlotVisible?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export function HeroVillainAvatarFrame({
  status,
  size = 'default',
  captionSlotVisible = false,
  children,
}) {
  const showCaptionSlot = size === 'default' && captionSlotVisible;
  const ariaLabel = status ? HERO_VILLAIN_ARIA[status] : undefined;

  return (
    <>
      <span
        className={
          'live-banner-row__avatar-wrap' +
          (status ? ' live-banner-row__avatar-wrap--' + status : '') +
          (size !== 'default' ? ' live-banner-row__avatar-wrap--size-' + size : '')
        }
        role={status ? 'img' : undefined}
        aria-label={ariaLabel}
        title={status && size === 'tiny' ? ariaLabel : undefined}
      >
        {children}
      </span>
      {showCaptionSlot ? (
        <span className="live-banner-row__caption-slot">
          {status ? (
            <span
              className={
                'live-banner-row__caption-pill live-banner-row__caption-pill--' + status
              }
              aria-hidden="true"
            >
              {HERO_VILLAIN_LABEL[status]}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}
