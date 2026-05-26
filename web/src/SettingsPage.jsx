/**
 * Settings page — minimal card under the More menu.
 * Spec: Mockup.jsx SettingsShowcase + Mockup.css .mockup-settings-* rules.
 * Two stacked rows in one card: Theme (segmented) + Default landing tab.
 * Both preferences write to localStorage immediately on change — no
 * Save button, no confirmation toast (the change itself is the feedback).
 *
 * Storage keys + the default-tab option list live in `settingsStorage.js`
 * so this file only exports a component (react-refresh-friendly).
 */

import { ThemeToggle } from './ThemeToggle'
import { DEFAULT_TAB_OPTIONS } from './settingsStorage'

/**
 * @param {{
 *   themePref: 'light' | 'dark' | 'system',
 *   onThemePrefChange: (t: 'light' | 'dark' | 'system') => void,
 *   defaultTab: string,
 *   onDefaultTabChange: (id: string) => void,
 * }} props
 */
export function SettingsPage({
  themePref,
  onThemePrefChange,
  defaultTab,
  onDefaultTabChange,
}) {
  return (
    <section className="tile tile--compact settings-page" aria-label="Settings">
      <h2 className="tile-title tile-title--sm">Settings</h2>

      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row__label" id="settings-theme-label">Theme</span>
          <ThemeToggle
            value={themePref}
            onChange={onThemePrefChange}
            includeSystem
          />
        </div>

        <div className="settings-row">
          <label
            className="settings-row__label"
            htmlFor="settings-default-tab"
          >
            Default landing tab
          </label>
          <select
            id="settings-default-tab"
            className="settings-select"
            value={defaultTab}
            onChange={(e) => onDefaultTabChange(e.target.value)}
          >
            {DEFAULT_TAB_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
