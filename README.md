# Heritage Booking

Self-hosted appointment booking for the Heritage optometry practice.

**Customers** sign in with Google / Microsoft / Facebook, pick an optometrist and a time, and can
reschedule or cancel online up to *N* hours before the appointment (default 24h).
**Admins** manage optometrists, weekly working hours, session length, time off, all appointments
(including booking on behalf of walk-in / phone customers), customers, and business settings.

Stack: Next.js 16 (App Router) · Auth.js v5 · Prisma · Postgres · Tailwind.

## Quick start

You need a Postgres database (local Docker, or a free [Neon](https://neon.tech) project).

```bash
npm install
cp .env.example .env            # then edit .env (see below)
npm run db:migrate              # apply migrations
npm run db:seed                 # default optometrist (Mon–Sun 9:00–18:00, 20 min) + admin account
npm run db:demo                 # optional: a few sample customers and bookings
npm run dev                     # http://localhost:3000
```

Local Postgres in one line: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=heritage postgres:16`

Default admin login (staff form on `/login`): `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
(`admin@heritage.local` / `change-me-now` unless you change them **before** seeding).

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Public URL, e.g. `https://book.thisisheritage.co` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth app. Redirect URI: `{AUTH_URL}/api/auth/callback/google` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_ISSUER` | Microsoft Entra app. Redirect URI: `{AUTH_URL}/api/auth/callback/microsoft-entra-id`. Keep issuer `https://login.microsoftonline.com/common/v2.0` to allow any personal or work Microsoft account. |
| `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET` | Facebook Login app. Redirect URI: `{AUTH_URL}/api/auth/callback/facebook` |
| `ADMIN_EMAILS` | Comma-separated emails that become ADMIN automatically when they sign in with a social account |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded email+password admin (staff fallback login) |
| `BUSINESS_TIMEZONE` | Default timezone for the seed (changeable later in Admin → Settings) |

A social button only appears on `/login` when its ID + secret are set, so you can enable providers one at a time.

## Business rules (all editable in Admin → Settings / Optometrists)

- Sessions: per optometrist `slotMinutes` (default 20) and `bufferMinutes` (default 0).
- Working hours: per optometrist, per weekday, in the business timezone. Time off blocks ranges.
- Customers can book from `minNoticeMinutes` ahead (default 60) up to `bookingWindowDays` (default 60).
- Customers can reschedule/cancel until `cancelCutoffHours` before the start (default 24). After that the UI tells them to phone the practice; admins can still change anything.
- Double-booking is prevented server-side (availability is recomputed inside the booking transaction).

## Admin device binding

Set `ADMIN_DEVICE_SECRET` (e.g. `openssl rand -hex 32`) in production. The admin console then requires, on top of an
admin login, a one-year httpOnly cookie that is only issued to a browser where the key was entered once at
`/enroll-device`. A stolen admin password alone is not enough to reach the console from another device.
Rotate the secret to sign every enrolled device out. Leave it unset for local development.

## Routes

| Path | Who | What |
| --- | --- | --- |
| `/` | public | landing |
| `/book` | public (sign-in required to confirm) | choose optometrist → day → time |
| `/appointments` | customer | upcoming/past, reschedule, cancel |
| `/appointments/[id]/reschedule` | customer | pick a new time |
| `/login` | public | social buttons + staff email/password |
| `/enroll-device` | admin | enter the device key once per browser (see Admin device binding) |
| `/admin` | admin | today's schedule |
| `/admin/appointments` | admin | search/filter, open, change status/notes, move |
| `/admin/appointments/new` | admin | book for a customer by email |
| `/admin/providers` | admin | add/edit optometrists, hours, session length, time off |
| `/admin/users` | admin | customers & staff, promote to admin |
| `/admin/settings` | admin | business name, timezone, cutoff, window |
| `/api/availability` | public | JSON slots (used by the booking UI) |

## Deploying to Vercel

1. Push this repo to GitHub and import it at https://vercel.com/new (framework: Next.js, no changes needed —
   the `vercel-build` script runs `prisma migrate deploy && next build`).
2. Database: in the Vercel project go to **Storage → Create → Neon (Postgres)**. This adds `DATABASE_URL`
   to the project automatically. (Any other Postgres works too: paste its URL as `DATABASE_URL`.)
3. Environment variables (Settings → Environment Variables):
   `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `ADMIN_EMAILS` (your own Google/Microsoft email so you become admin on first social login), `BUSINESS_TIMEZONE`,
   `ADMIN_DEVICE_SECRET` (see Admin device binding),
   and the social provider keys when you have them.
4. Deploy. Then seed once from your machine against the production database:
   `DATABASE_URL="<neon url>" ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed`
5. Add the production URL to each OAuth app's redirect URIs (see table above), and set `AUTH_URL` to it.

Other Node hosts (Railway, Render, Fly, a VPS) work the same way: `npm run db:migrate && npm run build && npm start`.

Later, the main website can simply link "Book now" to this app's URL.

## Not yet included

- Email/SMS confirmations and reminders (hook point: after `bookAppointment`, `rescheduleAppointment`, `cancelAppointment`).
- Calendar sync (Google/Outlook) for the optometrist.
- Payments / deposits.
