import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToast } from "../components/toast/ToastContext";

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

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
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name } },
      });

      if (authError) throw authError;

      if (data.session) {
        setSuccess("Signup successful! Redirecting to dashboard...");
        showToast("Account created successfully", "success");
        setTimeout(() => navigate("/app/dashboard", { replace: true }), 800);
      } else {
        setSuccess(
          "Account created. Please check your email and click the confirmation link, then you can log in."
        );
        showToast("Check your email to confirm your account", "success");
      }
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
          : "Unable to signup. Please try again.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centered-container w-full">
      <Card>
        <h1 className="card-title text-center">Create your AyurVision AI account</h1>
        <p className="card-subtitle text-center">
          Sign up to start exploring Ayurvedic insights and patient analytics.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <Input
            label="Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
          />

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
            placeholder="Choose a strong password"
            required
            minLength={6}
            rightElement={
              <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <Button type="submit" loading={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or continue with</span>
          <span className="auth-divider-line" />
        </div>

        <div className="auth-social-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              })
            }
          >
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
          Already have an account? <Link to="/login">Login</Link>
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

export default Signup;

