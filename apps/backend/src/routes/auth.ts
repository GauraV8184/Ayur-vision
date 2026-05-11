import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

/**
 * Get session from Supabase using access token (Bearer).
 * GET /api/auth/session
 */
router.get("/session", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    const name = user.user_metadata?.name ?? user.email?.split("@")[0] ?? "";
    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    const { data: profile } = await supabase
      .from("users")
      .select("id, email, name, created_at")
      .eq("id", user.id)
      .single();
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name ?? name,
        created_at: profile?.created_at ?? user.created_at,
      },
    });
  } catch (err) {
    console.error("Session error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Sign up with email/password via Supabase Auth.
 * POST /api/auth/signup — body: { name, email, password }
 * Returns Supabase session (access_token, refresh_token, user).
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const {
      data: { user, session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already registered")) {
        return res.status(400).json({ message: "Email already registered" });
      }
      return res.status(400).json({ message: error.message || "Signup failed" });
    }

    if (!user) {
      return res.status(500).json({ message: "Signup failed" });
    }

    // Upsert public.users so we have a single source for profile (id, email, name, created_at)
    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: name,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // If Supabase requires email confirmation, session may be null; still return user + tokens if present
    if (session) {
      return res.status(201).json({
        message: "Signup successful",
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        user: {
          id: user.id,
          email: user.email,
          name,
        },
      });
    }

    return res.status(201).json({
      message: "Signup successful. Please check your email to confirm your account.",
      user: {
        id: user.id,
        email: user.email,
        name,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error during signup" });
  }
});

/**
 * Login with email/password via Supabase Auth.
 * POST /api/auth/login — body: { email, password }
 * Returns Supabase session token.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const {
      data: { user, session },
      error,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res
        .status(400)
        .json({ message: error.message || "Invalid credentials" });
    }

    if (!user || !session) {
      return res.status(500).json({ message: "Login failed" });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    const name =
      profile?.name ?? user.user_metadata?.name ?? user.email?.split("@")[0];

    return res.json({
      message: "Login successful",
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      user: {
        id: user.id,
        email: user.email,
        name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

export default router;
