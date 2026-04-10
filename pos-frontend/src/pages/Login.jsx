import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { loginUser } from "../services/api";
import { ROLES, storeAuthSession } from "../utils/auth";

const quickAccessItems = [
  {
    title: "Card Swipe",
    description: "Swipe your employee ID card",
    icon: "CARD",
  },
  {
    title: "Biometric Scan",
    description: "Place finger on scanner",
    icon: "BIO",
  },
  {
    title: "Manager Auth",
    description: "Supervisor override",
    icon: "MGR",
  },
];

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    const submittedRole =
      event.nativeEvent.submitter?.dataset.role ?? ROLES.CASHIER;
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const { token, user } = await loginUser({
        email: normalizedEmail,
        password: trimmedPassword,
        role: submittedRole,
      });

      storeAuthSession({ token, user });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-brand">
        <div className="login-brand-mark" aria-hidden="true">
          <span>&#128722;</span>
        </div>
        <div>
          <h1>Supermarket POS</h1>
          <p>Next-Gen Retail Operations &amp; Management System</p>
        </div>
      </div>

      <section className="login-card" aria-label="Login area">
        <div className="login-main">
          <header className="login-header">
            <h2>Secure Access</h2>
            <p>Enter your credentials to access the terminal</p>
          </header>

          <form className="login-form" onSubmit={handleLogin} noValidate>
            <label className="login-field">
              <span>Active Store / Branch</span>
              <div className="login-input-wrap login-input-static">
                <span className="login-input-icon" aria-hidden="true">
                  STO
                </span>
                <span>Main Street Supermarket (HQ)</span>
              </div>
            </label>

            <label className="login-field">
              <span>Username or ID</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  ID
                </span>
                <input
                  type="email"
                  placeholder="e.g. j.doe.88"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error && !email.trim())}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-field-row">
                <span>Access PIN</span>
                <button
                  type="button"
                  className="login-link-button"
                  disabled={isLoading}
                  onClick={() =>
                    setError("Please contact your administrator to reset your PIN.")
                  }
                >
                  Forgot PIN?
                </button>
              </span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  PIN
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="****"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error && !password.trim())}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="login-toggle"
                  disabled={isLoading}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <p className={`login-error ${error ? "visible" : ""}`} role="alert">
              {error || " "}
            </p>

            <div className="login-actions">
              <button
                type="submit"
                className="login-submit"
                data-role={ROLES.CASHIER}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                Cashier Login
                <span aria-hidden="true">&rsaquo;</span>
              </button>
              <div className="login-secondary-actions">
                <button
                  type="submit"
                  className="login-secondary"
                  data-role={ROLES.ADMIN}
                  disabled={isLoading}
                >
                  Admin Login
                </button>
                <button
                  type="submit"
                  className="login-secondary"
                  data-role={ROLES.MANAGER}
                  disabled={isLoading}
                >
                  Manager Login
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="login-divider" aria-hidden="true">
          <span>OR</span>
        </div>

        <aside className="login-side">
          <header className="login-side-header">
            <h3>Quick Access</h3>
            <p>Use peripherals for rapid sign-in</p>
          </header>

          <div className="login-quick-grid">
            {quickAccessItems.map((item) => (
              <article key={item.title} className="login-quick-card">
                <div className="login-quick-icon" aria-hidden="true">
                  {item.icon}
                </div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <div className="login-security-note">
            <span className="login-security-dot" aria-hidden="true">
              &#10003;
            </span>
            <span>End-to-end encrypted session</span>
          </div>
        </aside>
      </section>

      <footer className="login-footer">
        <div className="login-footer-chip">TERMINAL: POS-MAIN-042</div>
        <div className="login-footer-text">Terminal Settings</div>
        <div className="login-footer-text">Server Connected: Sydney-East-01</div>
      </footer>

      <p className="login-support">Need help accessing your terminal? Contact IT Support</p>
    </main>
  );
}

export default Login;
