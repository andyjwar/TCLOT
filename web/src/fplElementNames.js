import { useEffect, useState } from 'react';

/**
 * FPL "full" name for display and ESPN matching: official first + last from bootstrap
 * (not `known_name`, which can be a short display token and differ from world feeds).
 */
export function fplElementFullName(el, elementId) {
  if (!el) return `Player #${elementId}`;
  const p = [el.first_name, el.second_name]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  if (p.length) return p.join(' ');
  return el.web_name?.trim() || `Player #${elementId}`;
}

/**
 * Short fantasy name — `web_name` (what FPL shows in the game UI) with fallback to full.
 */
export function fplElementWebName(el, elementId) {
  if (!el) return `Player #${elementId}`;
  const w = el.web_name?.trim();
  if (w) return w;
  return fplElementFullName(el, elementId);
}

/** @returns {boolean} */
export function useNarrow560() {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 560px)').matches,
  );
  useEffect(() => {
    const q = window.matchMedia('(max-width: 560px)');
    const f = () => setNarrow(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return narrow;
}
