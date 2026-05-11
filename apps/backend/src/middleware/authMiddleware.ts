import { supabase } from "../config/supabase.js";
import type { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string | null;
        user_metadata?: User["user_metadata"];
      };
    }
  }
}

/**
 * Protects routes using Supabase JWT.
 * Expects: Authorization: Bearer <access_token>
 * Sets req.user = { id, email, ... } from Supabase Auth.
 */
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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

    req.user = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Auth middleware error:", msg);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
