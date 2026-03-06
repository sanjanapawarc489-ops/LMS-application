import { useState } from "react";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>LMS Pro</div>
          <h2 style={{ fontSize: '1.75rem' }}>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {mode === "login" ? "Sign in to continue your learning journey" : "Register to start mastering new skills"}
          </p>
        </header>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={onSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter your name"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input
              name="email"
              value={form.email}
              onChange={onChange}
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              name="password"
              value={form.password}
              onChange={onChange}
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', marginTop: '1rem' }} disabled={submitting} type="submit">
            {submitting ? "Processing..." : mode === "login" ? "Sign In" : "Get Started"}
          </button>
        </form>

        <footer style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: '1.5rem', border: 'none' }}
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Demo Credentials</div>
            <div>student@lms.dev / password123</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

