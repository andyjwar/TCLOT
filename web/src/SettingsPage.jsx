/**
 * Settings page — minimal card under the More menu.
 * Spec: Mockup.jsx SettingsShowcase + Mockup.css .mockup-settings-* rules.
 * Stacked rows in one card: Theme, Default landing tab, then Push
 * notifications (opt-in toggle + My team + alert types). Preferences
 * write to localStorage immediately on change — no Save button, no
 * confirmation toast (the change itself is the feedback).
 *
 * Storage keys + the default-tab option list live in `settingsStorage.js`
 * so this file only exports components (react-refresh-friendly).
 *
 * `SettingsPanelBody` is the bare controls (Theme + Default tab + Push),
 * extracted so it can be embedded inside `LeagueInfoModal`'s Settings
 * card without re-implementing the form. `SettingsPage` is the
 * tile-wrapped version still used by the standalone `dashboardView ===
 * 'settings'` route in App.jsx.
 */

import { ThemeToggle } from './ThemeToggle'
import { DEFAULT_TAB_OPTIONS } from './settingsStorage'
import { CompactSelectPill } from './CompactSelectPill.jsx'
import { PushNotificationSettings } from './PushNotificationSettings.jsx'

/**
 * Just the form rows — Theme segmented + Default landing tab pill + Push.
 * Used by both the standalone Settings tile and the embedded Settings
 * card inside `LeagueInfoModal`.
 *
 * @param {{
 *   themePref: 'light' | 'dark' | 'system' | 'ceefax',
 *   onThemePrefChange: (t: 'light' | 'dark' | 'system' | 'ceefax') => void,
 *   defaultTab: string,
 *   onDefaultTabChange: (id: string) => void,
 *   push?: ReturnType<typeof import('./usePushNotifications.js').usePushNotifications>,
 * }} props
 */
export function SettingsPanelBody({
  themePref,
  onThemePrefChange,
  defaultTab,
  onDefaultTabChange,
  push,
}) {
  return (
    <div className="settings-card">
      <div className="settings-row">
        <span className="settings-row__label" id="settings-theme-label">Theme</span>
        <ThemeToggle
          value={themePref}
          onChange={onThemePrefChange}
          includeSystem
          includeCeefax
          showLabels
        />
      </div>

      <div className="settings-row">
        <label
          className="settings-row__label"
          id="settings-default-tab-label"
          htmlFor="settings-default-tab"
        >
          Default landing tab
        </label>
        <CompactSelectPill
          id="settings-default-tab"
          ariaLabel="Default landing tab"
          align="right"
          value={defaultTab}
          onChange={(next) => onDefaultTabChange(String(next))}
          options={DEFAULT_TAB_OPTIONS.map((opt) => ({
            value: opt.id,
            label: opt.label,
          }))}
        />
      </div>

      {push ? <PushNotificationSettings {...push} /> : null}
    </div>
  )
}

/**
 * @param {{
 *   themePref: 'light' | 'dark' | 'system' | 'ceefax',
 *   onThemePrefChange: (t: 'light' | 'dark' | 'system' | 'ceefax') => void,
 *   defaultTab: string,
 *   onDefaultTabChange: (id: string) => void,
 *   push?: ReturnType<typeof import('./usePushNotifications.js').usePushNotifications>,
 * }} props
 */
export function SettingsPage({
  themePref,
  onThemePrefChange,
  defaultTab,
  onDefaultTabChange,
  push,
}) {
  return (
    <section className="tile tile--compact settings-page" aria-label="Settings">
      <h2 className="tile-title tile-title--sm">Settings</h2>
      <SettingsPanelBody
        themePref={themePref}
        onThemePrefChange={onThemePrefChange}
        defaultTab={defaultTab}
        onDefaultTabChange={onDefaultTabChange}
        push={push}
      />
    </section>
  )
}
