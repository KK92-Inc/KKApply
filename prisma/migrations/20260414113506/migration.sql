-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT,
    "maxUsers" INTEGER,
    "autoComplete" BOOLEAN NOT NULL DEFAULT false,
    "eventTypeId" TEXT NOT NULL,
    "startsAt" TEXT,
    "registerUntil" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CONSTRAINT "event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_type" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_event" ("address", "autoComplete", "createdAt", "eventTypeId", "id", "maxUsers", "registerUntil", "startsAt", "updatedAt") SELECT "address", "autoComplete", "createdAt", "eventTypeId", "id", "maxUsers", "registerUntil", "startsAt", "updatedAt" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
CREATE TABLE "new_event_type" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO "new_event_type" ("createdAt", "description", "id", "name", "order", "updatedAt") SELECT "createdAt", "description", "id", "name", "order", "updatedAt" FROM "event_type";
DROP TABLE "event_type";
ALTER TABLE "new_event_type" RENAME TO "event_type";
CREATE TABLE "new_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+7 days')),
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_session" ("expiresAt", "id", "ip", "userId") SELECT "expiresAt", "id", "ip", "userId" FROM "session";
DROP TABLE "session";
ALTER TABLE "new_session" RENAME TO "session";
CREATE UNIQUE INDEX "session_userId_ip_key" ON "session"("userId", "ip");
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "emailToken" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO "new_user" ("banned", "createdAt", "email", "emailToken", "flags", "id", "subscribed", "updatedAt", "verified") SELECT "banned", "createdAt", "email", "emailToken", "flags", "id", "subscribed", "updatedAt", "verified" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_emailToken_key" ON "user"("emailToken");
CREATE TABLE "new_user_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "completedAt" TEXT,
    "startedAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CONSTRAINT "user_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_event_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_event" ("completedAt", "createdAt", "eventId", "id", "updatedAt", "userId") SELECT "completedAt", "createdAt", "eventId", "id", "updatedAt", "userId" FROM "user_event";
DROP TABLE "user_event";
ALTER TABLE "new_user_event" RENAME TO "user_event";
CREATE UNIQUE INDEX "user_event_userId_eventId_key" ON "user_event"("userId", "eventId");
CREATE TABLE "new_verification_token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+15 minutes')),
    CONSTRAINT "verification_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_verification_token" ("expiresAt", "id", "userId") SELECT "expiresAt", "id", "userId" FROM "verification_token";
DROP TABLE "verification_token";
ALTER TABLE "new_verification_token" RENAME TO "verification_token";
CREATE UNIQUE INDEX "verification_token_userId_key" ON "verification_token"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
