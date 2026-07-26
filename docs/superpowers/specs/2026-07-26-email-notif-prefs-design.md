# Email notification preferences

## Goal
Users can turn individual transactional emails on/off from Profile. In-app bell notifications stay unchanged.

## Categories & keys
- **Tasks:** `tAssign`, `tAssignMgr`, `tNew`, `remind`, `late`, `lateMgr`, `relance`
- **Appointments:** `apptNew`, `apptUpd`
- **Invites & membership:** `invNew`, `invNewAdmin`, `welcome`, `joined`

## Storage
`users.email_notifs` jsonb. Missing key = enabled (`true`).

## API
`GET/PATCH /me` expose `emailNotifs`. Partial PATCH merges known boolean keys.

## Send path
Transactional `sendMail` checks recipient prefs by type before sending. Admin `sendRaw` always sends.

## UI
Profile button → modal with 3 sections and a switch per type. Live-save on toggle.
