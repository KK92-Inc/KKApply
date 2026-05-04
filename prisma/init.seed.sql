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
  ('openday', 'Open Day',        'Campus visit and introduction to the programme.'),
  ('memory', 'Memory Challenge', 'Online assessment to evaluate your memory skills.'),
  ('coding', 'Coding Challenge', 'Online assessment to evaluate your problem-solving skills.'),
  ('piscine', 'Piscine',         'Intensive 4-week trial month. Sink or swim.'),
  ('kickoff', 'Kickoff',         'Choose your start date and officially begin the programme.');

-- ============================================================================
-- Event Types Dependencies
-- ============================================================================
-- Open Day -> Memory Challenge -> Coding Challenge -> Piscine -> Kickoff

INSERT INTO event_type_dependency (eventId, requiredTypeId) VALUES
  ('memory', 'openday'),  -- Memory Challenge requires Open Day
  ('coding', 'memory'),  -- Coding Challenge requires Memory Challenge
  ('piscine', 'coding'),  -- Piscine requires Coding Challenge
  ('kickoff', 'piscine');  -- Kickoff requires Piscine
