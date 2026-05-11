# Supabase setup for AyurVision

Follow these steps so sign-up, login, and uploads work correctly.

## 1. Create the database tables

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `schema.sql` (in this folder) and paste into the editor.
4. Click **Run**.

This creates:

- `public.users` – profile data (id, email, name, created_at).
- `public.plant_predictions` – saved plant predictions (user_id, image_url, plant, confidence).

## 2. Create the storage bucket (for plant images)

1. In the dashboard go to **Storage**.
2. Click **New bucket**.
3. Name: `plant-images`.
4. Choose **Public bucket** if you want image URLs to work without extra auth, or **Private** and configure RLS as needed.
5. Create the bucket.

## 3. Allow login right after sign-up (email confirmation)

By default Supabase requires users to confirm their email before they can log in. Until then, login returns "Invalid login credentials".

**Option A – Disable confirmation (good for development):**

1. Go to **Authentication** → **Providers** → **Email**.
2. Turn **OFF** “Confirm email”.
3. Save.

After this, new sign-ups can log in immediately with email/password.

**Option B – Keep confirmation (production):**

Leave “Confirm email” ON. After sign-up, users must click the link in the confirmation email before they can log in. The app will show: “Check your email to confirm your account.”

## 4. Google OAuth (optional)

If you use “Continue with Google”:

1. **Authentication** → **Providers** → **Google** → enable and set Client ID / Secret.
2. **Authentication** → **URL Configuration**: add your app URL and redirect URL (e.g. `http://localhost:5173/auth/callback`).

---

**Summary:** Run `schema.sql`, create the `plant-images` bucket, and turn off “Confirm email” for development so login works right after sign-up.
