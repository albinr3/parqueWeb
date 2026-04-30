-- Allow repeated ticket numbers across different mobile devices/shifts.
-- Idempotency is handled primarily via localId in sync events.
DROP INDEX IF EXISTS "Ticket_ticketNumber_key";
