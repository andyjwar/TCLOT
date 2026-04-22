import { groupGameWeekOptionsForSelect } from './gwLabel.js';

/**
 * Renders native `<optgroup>` rows: Past / Current / Upcoming (when the open list
 * is supported — e.g. desktop browsers; iOS may vary).
 */
export function GameWeekSelectOptgroups({ options }) {
  const { past, current, upcoming } = groupGameWeekOptionsForSelect(options);
  return (
    <>
      {past.length > 0 ? (
        <optgroup label="Past game weeks">
          {past.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {current.length > 0 ? (
        <optgroup label="Current game week">
          {current.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {upcoming.length > 0 ? (
        <optgroup label="Upcoming game weeks">
          {upcoming.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}
