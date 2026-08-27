-- One-shot: wipe every ticket and reset every bankroll to 1,000 Clotcoins.
-- No-ops after the first run (meta key freshStart:2026-08-27).
-- PINs, sessions, and markets are left alone.

DELETE FROM bets
 WHERE NOT EXISTS (SELECT 1 FROM meta WHERE k = 'freshStart:2026-08-27');

UPDATE users
   SET balance = 1000
 WHERE NOT EXISTS (SELECT 1 FROM meta WHERE k = 'freshStart:2026-08-27');

INSERT OR IGNORE INTO meta (k, v) VALUES ('freshStart:2026-08-27', 'applied');
