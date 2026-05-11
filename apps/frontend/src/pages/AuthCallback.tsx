import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/toast/ToastContext";

/**
 * Handles redirect from Supabase OAuth (e.g. Google).
 * Supabase adds tokens to the URL hash; the client will pick them up
 * via getSession() and onAuthStateChange.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("success");
      showToast("Signed in successfully.", "success");
      navigate("/app/dashboard", { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [navigate, showToast]);

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <p className="text-stone-600 dark:text-stone-400">
          Sign-in failed or was cancelled.
        </p>
        <a href="/login" className="text-herbal-forest underline dark:text-sage-400">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <p className="text-stone-600 dark:text-stone-400">Signing you in...</p>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-herbal-forest border-t-transparent dark:border-sage-400 dark:border-t-transparent" />
    </div>
  );
}
