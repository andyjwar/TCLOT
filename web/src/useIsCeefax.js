import { useSyncExternalStore } from 'react'

/**
 * Reactive read of whether the Ceefax skin is active. App writes the current
 * theme to `document.body.dataset.tclotTheme`; we subscribe to attribute
 * changes so components re-render when the user toggles themes live.
 */
function readIsCeefax() {
  if (typeof document === 'undefined') return false
  return document.body?.dataset?.tclotTheme === 'ceefax'
}

function subscribe(onChange) {
  if (typeof document === 'undefined') return () => {}
  const obs = new MutationObserver(onChange)
  obs.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-tclot-theme'],
  })
  return () => obs.disconnect()
}

export function useIsCeefax() {
  return useSyncExternalStore(subscribe, readIsCeefax, () => false)
}
