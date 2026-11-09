import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import "../components/styles/login.css";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Forgot password states
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard", {
        replace: true,
      });
    } catch {
      // error is already captured in useAuth().error and shown below
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, new_password: forgotNewPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotError(data.detail || data.email?.[0] || data.new_password?.[0] || "Failed to update password");
      } else {
        setForgotSuccess("Password updated successfully! Redirecting to sign in...");
        setEmail(forgotEmail);
        setPassword(forgotNewPassword);
        setTimeout(() => {
          setIsForgot(false);
          setForgotSuccess(null);
        }, 1500);
      }
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* ───────────────── LEFT PANEL ───────────────── */}
      <div className="login-left-panel">
        <div className="login-left-panel-overlay" />
        <div className="login-left-content">
          <div style={{ marginBottom: 36 }}>
            <div className="login-logo-name" style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
              HRMS
            </div>
            <div className="login-logo-sub" style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.75)", marginTop: 4 }}>
              Interactive team workspace
            </div>
          </div>

          <h1 className="login-headline">
            One workspace.
            <br />
            Every Task & Every Team.
          </h1>

          <p className="login-tagline">
            Track tasks, manage your team, and see project progress —
            all in one place, tailored to your role.
          </p>

          <div className="login-feature-grid">
            <div className="login-feature-card">
              <div className="login-feature-num">1</div>
              <div>
                <div className="login-feature-title">Admin dashboard</div>
                <div className="login-feature-desc">
                  Full task, team and progress overview.
                </div>
              </div>
            </div>
            <div className="login-feature-card">
              <div className="login-feature-num">2</div>
              <div>
                <div className="login-feature-title">Role-based access</div>
                <div className="login-feature-desc">
                  Employees see only their own tasks.
                </div>
              </div>
            </div>
            <div className="login-feature-card">
              <div className="login-feature-num">3</div>
              <div>
                <div className="login-feature-title">Task management</div>
                <div className="login-feature-desc">
                  Assign, update, and track task status.
                </div>
              </div>
            </div>
            <div className="login-feature-card">
              <div className="login-feature-num">4</div>
              <div>
                <div className="login-feature-title">Live progress</div>
                <div className="login-feature-desc">
                  Deadlines, status, and activity at a glance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── RIGHT PANEL (form) ───────────────── */}
      <div className="login-right-panel">
        <div className="login-card">
          {!isForgot ? (
            <>
              <h2 className="login-card-title">Sign in to your dashboard</h2>
              <p className="login-subtitle">
                Enter your credentials to access your workspace.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label">Email</label>
                  <div className="login-input-wrap">
                    <Mail size={15} className="login-input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="login-input-with-icon"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label">Password</label>
                  <div className="login-input-wrap">
                    <Lock size={15} className="login-input-icon" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="login-input-with-icon"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotNewPassword("");
                      setForgotConfirmPassword("");
                      setForgotError(null);
                      setForgotSuccess(null);
                      setIsForgot(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {error && <div className="login-error-box">{error}</div>}

                <button type="submit" disabled={loading} className="login-button">
                  {loading ? "Signing in..." : (
                    <>
                      Sign In <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="login-card-title">Reset your password</h2>
              <p className="login-subtitle">
                Enter your registered email and your new password.
              </p>

              <form onSubmit={handleForgotSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label">Registered Email</label>
                  <div className="login-input-wrap">
                    <Mail size={15} className="login-input-icon" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="login-input-with-icon"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label">New Password</label>
                  <div className="login-input-wrap">
                    <Lock size={15} className="login-input-icon" />
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="login-input-with-icon"
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label">Confirm New Password</label>
                  <div className="login-input-wrap">
                    <Lock size={15} className="login-input-icon" />
                    <input
                      type="password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="login-input-with-icon"
                      required
                    />
                  </div>
                </div>

                {forgotError && <div className="login-error-box">{forgotError}</div>}
                {forgotSuccess && (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }}
                  >
                    {forgotSuccess}
                  </div>
                )}

                <button type="submit" disabled={forgotLoading} className="login-button">
                  {forgotLoading ? "Updating..." : "Update Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}