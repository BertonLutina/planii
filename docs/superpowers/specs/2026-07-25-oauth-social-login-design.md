# OAuth Social Login — Design Spec

**Date:** 2026-07-25  
**Status:** Approved  
**Approach:** Direct OAuth on Express (Passport / openid-client), keep Planii JWT + `users` table

## Providers (v1)

Google, Microsoft (Outlook), LinkedIn, Yahoo

## Account linking

If OAuth email matches an existing Planii user → **auto-link** and sign in (option A).

## Callback URL pattern

`https://api.planii.app/api/auth/{provider}/callback`

Providers: `google` | `microsoft` | `linkedin` | `yahoo`

### Env vars (per provider)

| Provider | Client ID | Client secret |
|----------|-----------|---------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |
| Yahoo | `YAHOO_CLIENT_ID` | `YAHOO_CLIENT_SECRET` |

LinkedIn and Yahoo use OpenID Connect (`openid profile email`). Microsoft Graph: `user.read openid profile email`.

## Data

- `pass_hash` nullable
- `user_identities(user_id, provider, subject, email, created_at)` unique `(provider, subject)`

## Auth UI

Buttons on `Auth.tsx` next to email/password.

## Flow

Authorize → callback → upsert identity / auto-link by email → create user if needed → redirect to app with token → same JWT session.
