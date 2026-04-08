# London Calendar Adapter Contract

This document defines the recommended server-to-server contract between Olivia Core and the in-house calendar system inside `D:\london-tech-map`.

It is intentionally separate from the existing end-user routes in `london-tech-map`.

## Design intent

- `clueslondon.com` remains the source of truth for calendar data.
- Olivia Brain consumes the calendar through a private adapter surface.
- Olivia Brain does not depend on Prisma models or Clerk auth from the London app.

## Do not use the current public user routes directly

The current routes under `src/app/api/calendar/*` in `london-tech-map` are designed around:

- Clerk user auth
- browser-facing flows
- app-specific UI assumptions

Olivia Brain should instead talk to a dedicated internal namespace such as:

- `/api/internal/olivia/calendar/*`

## Authentication

Recommended request headers:

- `x-olivia-app-id`: stable caller identity such as `olivia-brain`
- `x-olivia-signature`: HMAC signature or shared secret verification
- `x-olivia-trace-id`: end-to-end trace correlation
- `x-olivia-idempotency-key`: required for write actions

Recommended request body context:

- `tenantId`
- `sourceApp`
- `actorType`
- `actorId`
- `reason`
- `requiresApproval`

## Required endpoints

### 1. Health

`GET /api/internal/olivia/calendar/health`

Purpose:

- verify adapter reachability
- verify auth
- verify high-level readiness

Response:

```json
{
  "ok": true,
  "service": "london-calendar",
  "version": "2026-04-08",
  "capabilities": [
    "entries.read",
    "entries.write",
    "attendees.write",
    "prep.read",
    "olivia.parse",
    "recommendations.read"
  ]
}
```

### 2. List entries by range

`GET /api/internal/olivia/calendar/entries?externalUserRef=...&start=...&end=...`

Purpose:

- get a normalized calendar view for Olivia reasoning
- avoid exposing the full product schema

### 3. Create entry

`POST /api/internal/olivia/calendar/entries`

Purpose:

- create a calendar entry in the London app
- return the canonical London calendar entry ID

Request:

```json
{
  "context": {
    "tenantId": "clues-london",
    "sourceApp": "olivia-brain",
    "actorType": "assistant",
    "actorId": "olivia",
    "reason": "Create follow-up meeting from Olivia workflow",
    "requiresApproval": false
  },
  "externalUserRef": "user_123",
  "entry": {
    "title": "Intro with Example Capital",
    "description": "Olivia-created follow-up",
    "location": null,
    "virtualUrl": null,
    "startDatetime": "2026-04-12T14:00:00.000Z",
    "endDatetime": "2026-04-12T15:00:00.000Z",
    "allDay": false,
    "entryType": "meeting",
    "category": "vc_meeting",
    "priority": "high",
    "isVip": true,
    "tags": ["olivia", "follow_up"],
    "ecosystemOrgName": "Example Capital",
    "investmentStage": "seed"
  }
}
```

### 4. Update entry

`PATCH /api/internal/olivia/calendar/entries/:entryId`

Purpose:

- reschedule, change metadata, update attendance status, or archive intent

### 5. Archive entry

`DELETE /api/internal/olivia/calendar/entries/:entryId`

Purpose:

- soft-delete through the London calendar rules

### 6. Bulk set attendees

`POST /api/internal/olivia/calendar/entries/:entryId/attendees`

Purpose:

- set or replace the attendee list for an entry

### 7. Get prep tasks

`GET /api/internal/olivia/calendar/entries/:entryId/prep-tasks`

Purpose:

- fetch prep work for Olivia briefings and reminders

### 8. Create prep task

`POST /api/internal/olivia/calendar/entries/:entryId/prep-tasks`

Purpose:

- allow Olivia to add prep work without bypassing London calendar logic

### 9. Parse natural language

`POST /api/internal/olivia/calendar/parse`

Purpose:

- delegate natural-language event parsing to the London calendar system
- preserve one authoritative parser for this product

Request:

```json
{
  "context": {
    "tenantId": "clues-london",
    "sourceApp": "olivia-brain",
    "actorType": "assistant",
    "actorId": "olivia",
    "reason": "Interpret user scheduling request",
    "requiresApproval": false
  },
  "externalUserRef": "user_123",
  "text": "Set up a seed intro with Example Capital next Thursday at 2pm",
  "conversationId": "optional-conversation-ref"
}
```

### 10. Get recommendations

`GET /api/internal/olivia/calendar/recommendations?externalUserRef=...`

Purpose:

- surface active London-calendar recommendations back into Olivia Core

## Recommended normalized entry shape

```json
{
  "id": "calendar_entry_id",
  "title": "Intro with Example Capital",
  "description": "Olivia-created follow-up",
  "location": null,
  "virtualUrl": null,
  "startDatetime": "2026-04-12T14:00:00.000Z",
  "endDatetime": "2026-04-12T15:00:00.000Z",
  "allDay": false,
  "entryType": "meeting",
  "category": "vc_meeting",
  "priority": "high",
  "attendanceStatus": "pending",
  "isVip": true,
  "isAiGenerated": true,
  "aiSource": "olivia-brain",
  "linkedEventId": null,
  "linkedOrgId": "optional-linked-org-id",
  "ecosystemOrgName": "Example Capital",
  "investmentStage": "seed",
  "tags": ["olivia", "follow_up"],
  "externalProvider": null,
  "externalCalendarId": null,
  "createdAt": "2026-04-08T15:00:00.000Z",
  "updatedAt": "2026-04-08T15:00:00.000Z"
}
```

## Error contract

All adapter errors should return:

```json
{
  "error": {
    "code": "CALENDAR_ENTRY_NOT_FOUND",
    "message": "Calendar entry was not found for this user.",
    "retryable": false
  }
}
```

Recommended error codes:

- `UNAUTHORIZED_ADAPTER_CALL`
- `INVALID_EXTERNAL_USER_REF`
- `CALENDAR_ENTRY_NOT_FOUND`
- `INVALID_CALENDAR_RANGE`
- `INVALID_ATTENDEE_PAYLOAD`
- `PARSER_UNAVAILABLE`
- `APPROVAL_REQUIRED`
- `RATE_LIMITED`

## Security and operational rules

- require server-to-server auth, never browser auth
- require idempotency keys on all writes
- log actor, reason, and trace ID on every write
- keep London IDs canonical
- return only the fields Olivia actually needs
- never expose provider tokens or sync internals through the adapter

## Implementation note

The London app already has the underlying domain capabilities:

- calendar entry CRUD
- attendee management
- prep tasks
- recommendations
- Olivia NLP parsing
- sync tracking

The adapter should wrap those capabilities, not reimplement them.
