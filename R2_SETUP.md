# WAR ROOM — Cloudflare R2 Toolkit Storage

WAR ROOM keeps users, events, registrations, scores and leaderboard metadata in SQL. Large toolkit ZIP files are stored in Cloudflare R2.

## Required Vercel Environment Variables

Set these for Production, Preview and Development as needed:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT_URL` (normally `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
- `R2_PRESIGN_SECONDS=900`

## Cloudflare R2 Bucket CORS

Use `r2-cors.example.json` as the starting policy. Replace `https://YOUR-PROJECT.vercel.app` with the real WAR ROOM Vercel origin.

For a browser upload, the bucket must allow `PUT` from the WAR ROOM origin and allow the `Content-Type` header.

## Upload flow

1. Admin selects a ZIP toolkit.
2. FastAPI authenticates the admin and creates a short-lived R2 presigned PUT URL.
3. Browser uploads the ZIP directly to R2.
4. FastAPI verifies the R2 object with `HEAD`.
5. SQL stores only toolkit metadata and the R2 object key.
6. Downloads use a fresh short-lived R2 presigned GET URL.

The ZIP does not pass through the Vercel Function.

## Local development CORS

If the WAR ROOM is opened at `http://127.0.0.1:8000` or `http://localhost:8000`, those exact origins must be present in the R2 bucket CORS policy. `localhost` and `127.0.0.1` are different browser origins. Apply the contents of `r2-cors.example.json` to the R2 bucket, replacing `https://YOUR-PROJECT.vercel.app` with the real Vercel deployment origin before production testing.
