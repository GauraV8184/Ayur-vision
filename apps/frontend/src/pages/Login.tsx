import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/toast/ToastContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app/dashboard";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const errorFromUrl = searchParams.get("error");
    if (errorFromUrl) {
      const msg = decodeURIComponent(errorFromUrl);
      setError(msg);
      showToast(msg, "error");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, showToast, setSearchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as keyof typeof prev]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      setSuccess("Login successful! Redirecting...");
      showToast("Logged in successfully", "success");

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: { data?: { message?: string } };
        code?: string;
      };
      let message =
        axiosErr.message ||
        axiosErr.response?.data?.message ||
        (axiosErr.code === "ERR_NETWORK" || !axiosErr.response
          ? "Cannot reach server. Ensure backend and Supabase are configured."
          : "Unable to login. Please try again.");
      if (
        message?.toLowerCase().includes("email not confirmed") ||
        message?.toLowerCase().includes("invalid login credentials")
      ) {
        message =
          "Invalid email or password, or your email is not confirmed yet. Check your inbox for the confirmation link.";
      }
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="centered-container w-full">
      <Card>
        <h1 className="card-title text-center">Welcome back to AyurVision AI</h1>
        <p className="card-subtitle text-center">
          Sign in to access your Ayurvedic dashboard and patient insights.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            rightElement={
              <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <Button type="submit" loading={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or continue with</span>
          <span className="auth-divider-line" />
        </div>

        <div className="auth-social-wrap">
          <Button type="button" variant="secondary" onClick={handleGoogleLogin} className="auth-google-btn">
            <span className="auth-google-inner">
              <svg aria-hidden="true" focusable="false" className="auth-google-icon" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-2 3.1l3.2 2.5C20.8 18.2 22 15.4 22 12c0-.7-.1-1.3-.2-1.8H12z" />
                <path fill="#34A853" d="M6.6 14.3l-.8.6-2.6 2C4.4 19.9 7 21.5 10 21.5c2.7 0 4.9-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.5 0-4.5-1.7-5.2-4z" />
                <path fill="#4A90E2" d="M3.2 6.9C2.4 8.2 2 9.6 2 11c0 1.4.4 2.8 1.2 4.1 0 0 1.5-1.2 2.6-2 .3-.9.4-1.8.4-2.5 0-.9-.2-1.8-.4-2.5z" />
                <path fill="#FBBC05" d="M10 4.5c1.5 0 2.9.5 3.9 1.5l2.9-2.9C15 1.8 12.7 1 10 1 7 1 4.4 2.6 2.9 4.9L6.2 7C6.9 5 8.8 4.5 10 4.5z" />
              </svg>
              <span>Continue with Google</span>
            </span>
          </Button>
        </div>

        <p className="card-footer mt-5 text-center">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
        <p className="card-footer text-center">
          <button
            type="button"
            onClick={() => {
              supabase.auth.signInAnonymously().then(() => {
                navigate("/app/dashboard", { replace: true });
              });
            }}
            className="auth-demo-btn"
          >
            Continue in demo mode (anonymous)
          </button>
        </p>
      </Card>
    </div>
  );
};

export default Login;