<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1eo1UqB3se7AIMgoGQLdJKFmXgk--ZP_A

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## PWA: Install + Offline + Web Push (Android)

This project supports:
- Add to Home Screen / Install (desktop + mobile)
- Offline caching via Service Worker
- Web Push notifications (Android Chrome)

### 1) VAPID keys

Generate VAPID keys (run anywhere you have Node installed):

`npx web-push generate-vapid-keys`

Add the **public key** to your Vite env:

`VITE_VAPID_PUBLIC_KEY=...`

### 2) Supabase Edge Function secrets

The Edge Function `push` requires these secrets:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (example: `mailto:admin@yourdomain.com`)

Set them in Supabase:

`supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:admin@yourdomain.com`

### 3) Deploy the Edge Function + apply migrations

- Apply DB migration in `supabase/migrations/20251229_push_subscriptions.sql`
- Deploy function `supabase/functions/push`

### 4) Test on Android

- Open the site in Chrome on Android
- Install the PWA
- In the mobile app: Account → Notifications → enable **Web push notifications** → press **Test**
