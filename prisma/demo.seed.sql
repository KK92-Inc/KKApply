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
INSERT INTO event_type (id, name, description, "order") VALUES
  ('openday',  'Open Day',          'Campus visit and introduction to the programme.', 0),
  ('memory',   'Memory Challenge',  'Online assessment to evaluate your memory skills.', 1),
  ('coding',   'Coding Challenge',  'Online assessment to evaluate your problem-solving skills.', 2),
  ('piscine',  'Piscine',           'Intensive 4-week trial month. Sink or swim.', 3),
  ('kickoff',  'Kickoff',           'Choose your start date and officially begin the programme.', 4);

-- ============================================================================
-- Open Days
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('019dafdc-c2fd-7000-aecb-9086b0e81185', 'openday', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-65 days')),

  ('019dafdd-0872-7000-a7db-4d16eee313af', 'openday', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+30 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+25 days')),

  ('019dafdd-0eb5-7000-8a24-a9525ec4e6ac', 'openday', 'Codam, Science Park 30, Amsterdam', 200, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+120 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+115 days'));

-- ============================================================================
-- Memory Challenges
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('019db00e-4c88-7000-950e-5137601e268e', 'memory', NULL, NULL, 0, NULL, NULL);

-- ============================================================================
-- Coding Challenges
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('019db00e-4c88-7000-950e-5137601e268e', 'coding', NULL, NULL, 0, NULL, NULL);

-- ============================================================================
-- Event Type Dependencies (type-level — attach to a representative event,
-- OR fix the schema to make this EventType → EventType. See note below.)
-- ============================================================================
-- NOTE: Your schema ties dependencies to ApplicationEvent instances, not types.
-- These inserts use the first instance of each type as a stand-in, but you
-- likely want to move this relation up to EventType itself.
INSERT INTO event_type_dependency (eventId, requiredTypeId) VALUES
  ('019db00e-4c88-7000-950e-5137601e268e', 'openday'),   -- memory requires openday
  ('019db00e-4c88-7000-950e-5137601e268e', 'memory'),    -- coding requires memory
  ('019db010-c755-7000-9d55-93d5bf43467b', 'coding'),    -- piscine requires coding
  ('019db010-ebd4-7000-a6e3-9829466fc701', 'coding'),
  ('019db011-0402-7000-af6c-d0e610fef9df', 'coding'),
  ('019db012-8f8f-7000-bf8f-8f8f8f8f8f8f', 'piscine');   -- kickoff requires piscine

-- ============================================================================
-- Piscines
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('019db010-c755-7000-9d55-93d5bf43467b', 'piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+45 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+35 days')),

  ('019db010-ebd4-7000-a6e3-9829466fc701', 'piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+180 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+170 days')),

  ('019db011-0402-7000-af6c-d0e610fef9df', 'piscine', 'Codam, Science Park 30, Amsterdam', 40, 1,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+270 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+260 days'));

-- ============================================================================
-- Kickoff
-- ============================================================================
INSERT INTO event (id, eventTypeId, address, maxUsers, autoComplete, startsAt, registerUntil) VALUES
  ('019db012-8f8f-7000-bf8f-8f8f8f8f8f8f', 'kickoff', 'Codam, Science Park 30, Amsterdam', NULL, 0,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+320 days'),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+300 days'));

-- ============================================================================
-- Test user — Alice
-- ============================================================================
INSERT INTO user (id, email, verified, emailToken) VALUES
  ('019db011-5cac-7000-822a-fae2d8529207', 'alice@example.com', 1, 'tok-alice');

-- ============================================================================
-- Alice's state:
--  ✅  Open Day (ev-od-1)       completed 55 days ago
--  ✅  Memory  (ev-me-1)        completed 20 days ago
--  ❌  Coding  (ev-ch-1)        registered, event passed, no completion (missed)
--  🔵  Coding  (ev-ch-2)        registered, starts in 14 days
--  🔒  Piscines / Kickoff       locked — coding not completed yet
-- ============================================================================
-- INSERT INTO user_event (id, userId, eventId, completedAt) VALUES
--   ('ue-1', 'usr-alice', 'ev-od-1',
--     strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-55 days')),

--   ('ue-2', 'usr-alice', 'ev-me-1',
--     strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-20 days')),

--   ('ue-3', 'usr-alice', 'ev-ch-1', NULL),

--   ('ue-4', 'usr-alice', 'ev-ch-2', NULL);