/**
 * Settings rows for browser push notifications.
 */

import { CompactSelectPill } from './CompactSelectPill.jsx'

/**
 * @param {{
 *   capability: { supported: boolean, configured: boolean, apiBase: string },
 *   enabled: boolean,
 *   entryId: number | null,
 *   prefs: { gwDeadline: boolean, waiverResults: boolean, liveKickoff: boolean },
 *   status: string,
 *   error: string,
 *   setEnabled: (next: boolean) => Promise<void>,
 *   setEntryId: (next: string | number | null) => void,
 *   setPref: (key: string, value: boolean) => void,
 *   teamOptions: Array<{ value: string, label: string }>,
 * }} props
 */
export function PushNotificationSettings({
  capability,
  enabled,
  entryId,
  prefs,
  status,
  error,
  setEnabled,
  setEntryId,
  setPref,
  teamOptions,
}) {
  const disabled = !capability.supported || !capability.configured

  let hint = 'Get deadline, waiver, and live GW alerts from the TCLOT web app.'
  if (!capability.supported) {
    hint = 'This browser does not support web push notifications.'
  } else if (!capability.configured) {
    hint = 'Push is not configured for this deploy (missing VITE_PUSH_API_URL / VITE_VAPID_PUBLIC_KEY).'
  }

  return (
    <>
      <div className="settings-row settings-row--stack">
        <div className="settings-row__stack-head">
          <span className="settings-row__label" id="settings-push-label">
            Push notifications
          </span>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={enabled}
              disabled={disabled || status === 'working'}
              aria-labelledby="settings-push-label"
              onChange={async (e) => {
                try {
                  await setEnabled(e.target.checked)
                } catch {
                  /* error surfaced via `error` prop */
                }
              }}
            />
            <span className="settings-toggle__track" aria-hidden="true" />
          </label>
        </div>
        <p className="settings-row__hint">{hint}</p>
        {error ? <p className="settings-row__error" role="alert">{error}</p> : null}
      </div>

      {enabled && !disabled ? (
        <>
          <div className="settings-row">
            <label className="settings-row__label" htmlFor="settings-push-team">
              My team
            </label>
            <CompactSelectPill
              id="settings-push-team"
              ariaLabel="My team for notifications"
              align="right"
              value={entryId == null ? '' : String(entryId)}
              onChange={(next) => setEntryId(next === '' ? null : next)}
              options={[
                { value: '', label: 'All league alerts' },
                ...teamOptions,
              ]}
            />
          </div>

          <fieldset className="settings-row settings-row--checks">
            <legend className="settings-row__label">Alert types</legend>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={prefs.gwDeadline}
                onChange={(e) => setPref('gwDeadline', e.target.checked)}
              />
              <span>GW deadline reminders</span>
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={prefs.waiverResults}
                onChange={(e) => setPref('waiverResults', e.target.checked)}
              />
              <span>Waiver results</span>
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={prefs.liveKickoff}
                onChange={(e) => setPref('liveKickoff', e.target.checked)}
              />
              <span>GW live kickoff</span>
            </label>
          </fieldset>
        </>
      ) : null}
    </>
  )
}
