-- ============================================================================
-- Clean slate
-- ============================================================================
DELETE FROM user_event;
DELETE FROM event_type_dependency;
DELETE FROM event;
DELETE FROM event_type;
DELETE FROM user;

-- ============================================================================
-- Event Types
-- ============================================================================
INSERT INTO event_type (id, name, description) VALUES
  ('et-open-day',  'Open Day',        'Campus visit and introduction to the programme.'),
  ('et-challenge', 'Coding Challenge', 'Online assessment to evaluate your problem-solving skills.'),
  ('et-piscine',   'Piscine',         'Intensive 4-week trial month. Sink or swim.'),
  ('et-kickoff',   'Kickoff',         'Choose your start date and officially begin the programme.');

-- ============================================================================
-- Open Days  (3x per year cadence)
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('ev-od-1', 'et-open-day', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-65 days')),

  ('ev-od-2', 'et-open-day', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+30 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+25 days')),

  ('ev-od-3', 'et-open-day', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+120 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+115 days'));

-- ============================================================================
-- Coding Challenges  (3x per year, requires Open Day)
-- ============================================================================

INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('ev-ch-1', 'et-challenge', NULL, NULL, 0, NULL, NULL),  -- timeless, no deadline
  ('ev-ch-2', 'et-challenge', NULL, NULL, 0, NULL, NULL),  -- second attempt slot
  ('ev-ch-3', 'et-challenge', NULL, NULL, 0, NULL, NULL);  -- third attempt slot

-- ============================================================================
-- Piscines  (3x per year, requires Coding Challenge)
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('ev-pi-1', 'et-piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+45 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+35 days')),

  ('ev-pi-2', 'et-piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+180 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+170 days')),

  ('ev-pi-3', 'et-piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+270 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+260 days'));

-- ============================================================================
-- Kickoff  (1x per year, requires Piscine)
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('ev-ko-1', 'et-kickoff', 'Codam, Science Park 30, Amsterdam', NULL, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+320 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+300 days'));

-- ============================================================================
-- Prerequisites  (every event enforces the full chain)
-- ============================================================================

-- Challenges require Open Day
INSERT INTO event_type_dependency (eventId, requiredTypeId) VALUES
  ('ev-ch-1', 'et-open-day'),
  ('ev-ch-2', 'et-open-day'),
  ('ev-ch-3', 'et-open-day');

-- Piscines require Coding Challenge
INSERT INTO event_type_dependency (eventId, requiredTypeId) VALUES
  ('ev-pi-1', 'et-challenge'),
  ('ev-pi-2', 'et-challenge'),
  ('ev-pi-3', 'et-challenge');

-- Kickoff requires Piscine
INSERT INTO event_type_dependency (eventId, requiredTypeId) VALUES
  ('ev-ko-1', 'et-piscine');

-- ============================================================================
-- Test user — Alice
-- ============================================================================
INSERT INTO user (id, email, verified, emailToken) VALUES
  ('usr-alice', 'alice@example.com', 1, 'tok-alice');

-- ============================================================================
-- Alice's state — every meaningful status represented:
--
--  ✅  Open Day (ev-od-1)        completed 55 days ago
--  ❌  Coding Challenge (ev-ch-1) MISSED — was registered, event passed, no completion
--  🔵  Coding Challenge (ev-ch-2) registered, starts in 14 days, can unregister
--  📅  Coding Challenge (ev-ch-3) hidden — already picked ev-ch-2 (future active)
--  🔒  Piscines (all 3)          locked — challenge not completed yet
--  🔒  Kickoff                   locked — piscine not completed yet
-- ============================================================================
INSERT INTO user_event (id, userId, eventId, completedAt) VALUES
  ('ue-1', 'usr-alice', 'ev-od-1',
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-55 days')),

  ('ue-2', 'usr-alice', 'ev-ch-1', NULL),

  ('ue-3', 'usr-alice', 'ev-ch-2', NULL);