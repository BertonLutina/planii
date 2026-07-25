# User & Project Profile Pictures — Design Spec

**Date:** 2026-07-25  
**Status:** Approved for implementation  
**Storage:** Hostinger VPS disk (Approach 1)

---

## Goals

1. Users can upload / change a **profile picture** on the Profile page.
2. Project **owners** can set / change a **project picture** when creating a project and in Project details.
3. Left navigation layout:
   - **Top:** user profile picture, then username below it
   - **Middle:** existing nav + projects list
   - **Bottom:** Planii logo + word “Planii”
4. When a picture is replaced or removed, the **previous file is deleted from disk** immediately. Only the current image is kept.

## Non-goals (v1)

- Cloud object storage (R2/S3)
- Image cropping UI (accept square-ish upload; CSS `object-fit: cover`)
- Multiple photos / galleries
- Non-owner project image edits

---

## Storage

| Item | Path on disk | Public URL |
|------|----------------|------------|
| User avatar | `{UPLOAD_DIR}/avatars/{userId}.{ext}` | `/api/uploads/avatars/{userId}.{ext}` |
| Project image | `{UPLOAD_DIR}/projects/{projectId}.{ext}` | `/api/uploads/projects/{projectId}.{ext}` |

- `UPLOAD_DIR` env (default `/data/uploads` or `./uploads` in local/dev).
- Allowed: `image/jpeg`, `image/png`, `image/webp` (max **2 MB**).
- Normalize extension to `jpg` / `png` / `webp` from MIME.
- On replace: write new file (possibly new ext) → update DB URL → **unlink** previous file if path differed.
- On clear/remove: set DB URL null → unlink file.
- Docker/deploy: mount persistent volume at `UPLOAD_DIR` so files survive redeploys.

## Database

**Migration:**
- `users.avatar_url text null`
- `projects.image_url text null`

Expose in API public user + project payloads as `avatarUrl` / `imageUrl`.

## API

| Method | Path | Who | Body |
|--------|------|-----|------|
| `POST` | `/me/avatar` | auth | `multipart/form-data` field `file` → `{ avatarUrl }` |
| `DELETE` | `/me/avatar` | auth | clears + deletes file |
| `POST` | `/projects/:id/image` | owner | multipart `file` → `{ imageUrl }` |
| `DELETE` | `/projects/:id/image` | owner | clears + deletes file |
| `GET` | `/uploads/*` | public or auth (prefer auth-gated static with cache headers, or public read of upload paths) | serve file |

Also accept optional image on create:
- `POST /projects` may include multipart with `image` **or** follow-up `POST /projects/:id/image` right after create (prefer follow-up for simpler JSON create + separate upload).

**Replace rule (mandatory):** before or after saving the new file, delete the previous file referenced by the old URL if it lives under `UPLOAD_DIR`. Never leave orphaned previous images.

## Frontend

### Avatar component
Extend `Avatar` in `ui.tsx`: optional `src?: string | null`. If `src`, show `<img>`; else initials.

### Left nav (`App.tsx` Shell)
```
[ avatar ]
[ username ]
───────────
search + nav + projects
───────────
[ Planii logo ]
Planii
```
Remove user block from footer; move brand from top to bottom.

### Profile page
- Large avatar; click or “Change photo” → file picker → upload → refresh `me`.
- “Remove photo” if `avatarUrl` set.

### Projects
- **New project:** optional image picker before/after create; after create call upload endpoint.
- **ProjectDetail / EditProject (owner):** show image + change/remove controls.
- Project cards / sidebar project dots: use `imageUrl` when present.

## Security

- Validate MIME + size server-side; reject non-images.
- Owner check for project image.
- Serve only files under `UPLOAD_DIR` (path traversal safe).
- Filenames tied to ids (no user-controlled filenames on disk).

## Success criteria

1. User uploads avatar → appears in Profile + left nav top.
2. Nav shows Planii brand at bottom.
3. Owner sets project image on create and in details → visible on cards/header.
4. Replacing or removing a photo deletes the old file from disk.
5. Initials fallback when no image.
