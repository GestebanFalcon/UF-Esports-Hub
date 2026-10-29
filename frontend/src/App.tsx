import { useState, type FormEvent } from "react";
import {
  loginSchema,
  registerSchema,
  registerRequestSchema,
  registerResponseSchema,
  authErrorSchema,
} from "@uf-esports-hub/shared";
import { API_BASE_URL, AuthApiError, authClient, type Session } from "./auth";
import { useAuth } from "./use-auth";
import "./index.css";

function Arrow({ back = false }: { back?: boolean }) {
  return <span aria-hidden="true">{back ? "↗" : "→"}</span>;
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="UF Esports Hub home">
      <span className="brand-mark" aria-hidden="true">
        UF
        <span />
      </span>
      <span>
        ESPORTS<span className="brand-subtitle">UNIVERSITY OF FLORIDA</span>
      </span>
    </a>
  );
}

function AuthPage({ mode, session, ready }: {
  mode: "login" | "register";
  session: Session | null;
  ready: boolean;
}) {
  const isLogin = mode === "login";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !ready) return;

    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form));

    setMessage("");

    // Check if the information entered is valid
    const result = (isLogin ? loginSchema : registerSchema).safeParse(
      formData,
    );

    if (!result.success) {
      const nextErrors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "form");
        nextErrors[field] ??= issue.message;
      }

      setErrors(nextErrors);

      const firstField = Object.keys(nextErrors)[0];

      if (firstField) {
        form
          .querySelector<HTMLInputElement>(`[name="${firstField}"]`)
          ?.focus();
      }

      return;
    }

    setErrors({});

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await authClient.login(loginSchema.parse(result.data));
        form.reset();
        setShowPassword(false);
        return;
      }

      // Prepare the registration information
      const registrationData = registerRequestSchema.parse(result.data);

      // Send the information to the Express backend
      const response = await fetch(
        `${API_BASE_URL}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
        },
      );

      const responseData: unknown = await response.json();

      // Check for errors from the backend
      if (!response.ok) {
        const errorResult = authErrorSchema.safeParse(responseData);

        if (errorResult.success) {
          const nextErrors: Record<string, string> = {};

          for (const [field, messages] of Object.entries(
            errorResult.data.fieldErrors ?? {},
          )) {
            if (messages[0]) {
              nextErrors[field] = messages[0];
            }
          }

          setErrors(nextErrors);
          setMessage(errorResult.data.message);

          const firstField = Object.keys(nextErrors)[0];

          if (firstField) {
            form
              .querySelector<HTMLInputElement>(
                `[name="${firstField}"]`,
              )
              ?.focus();
          }
        } else {
          setMessage(
            "Could not create account. Please try again.",
          );
        }

        return;
      }

      // Check that the backend returned a valid user
      const successResult = registerResponseSchema.safeParse(
        responseData,
      );

      if (!successResult.success) {
        setMessage(
          "The server returned an unexpected response.",
        );
        return;
      }

      // Show a message when the account is created
      setMessage(
        "Account created successfully! You can now log in.",
      );

      // Clear the registration form
      form.reset();
      setShowPassword(false);

    } catch (error) {
      if (error instanceof AuthApiError) {
        const nextErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) nextErrors[field] = messages[0];
        }
        setErrors(nextErrors);
        setMessage(error.message);
        const firstField = Object.keys(nextErrors)[0];
        if (firstField) {
          form.querySelector<HTMLInputElement>(`[name="${firstField}"]`)?.focus();
        }
      } else {
        setMessage("Could not connect to the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-layout">
      <section className="register-intro">
        <a className="back-link" href="/">
          ← Back to home
        </a>

        <div className="intro-copy">
          <p className="eyebrow">
            <span /> {isLogin ? "BACK IN THE GAME" : "YOUR NEXT CHAPTER"}
          </p>

          <h1>
            {isLogin ? "Your community." : "Every team"}
            <br /> {isLogin ? "Your game." : "starts with"}
            <br />{" "}
            <span>
              {isLogin ? "Welcome back." : "one player."}
            </span>
          </h1>

          <p className="intro-description">
            {isLogin
              ? "Good to see you again. Make your next move."
              : "Make your place in the UF esports community."}
          </p>
        </div>

        <div className="intro-bottom">
          <span className="small-cross">+</span>
          <span>ONE CAMPUS. EVERY GAME.</span>
          <span>01 / 01</span>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="auth-title">
        <div className="form-heading">
          <span className="section-number">
            {isLogin ? "02 — WELCOME BACK" : "01 — JOIN THE HUB"}
          </span>

          <h2 id="auth-title">
            {isLogin ? "Log in to the hub" : "Create your account"}
            <span>.</span>
          </h2>

          <p>
            {isLogin
              ? "Pick up where you left off."
              : "Your community. Your next team. Start here."}
          </p>
        </div>

        {session ? (
          <div className="signed-in" role="status">
            <p>Welcome, {session.user.username}. You are logged in.</p>
            <a className="button primary" href="/">Go to home <Arrow /></a>
          </div>
        ) : (
          <>
            <form onSubmit={submit} noValidate aria-busy={isSubmitting || !ready}>
              {!isLogin && (
                <div className="field">
                  <label htmlFor="username">Username</label>

                  <input
                    id="username"
                    name="username"
                    placeholder="Your in-game name"
                    autoComplete="username"
                    required
                    aria-invalid={!!errors.username}
                    aria-describedby={
                      errors.username ? "username-error" : undefined
                    }
                  />

                  {errors.username && (
                    <p className="field-error" id="username-error">
                      {errors.username}
                    </p>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@ufl.edu"
                  autoComplete={isLogin ? "username" : "email"}
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={
                    errors.email ? "email-error" : undefined
                  }
                />

                {errors.email && (
                  <p className="field-error" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>

                <div className="password-input">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      isLogin
                        ? "Enter your password"
                        : "Create a password"
                    }
                    autoComplete={
                      isLogin ? "current-password" : "new-password"
                    }
                    required
                    minLength={isLogin ? undefined : 8}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password
                        ? "password-error"
                        : isLogin
                          ? undefined
                          : "password-hint"
                    }
                  />

                  <button
                    className="visibility-toggle"
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {errors.password ? (
                  <p className="field-error" id="password-error">
                    {errors.password}
                  </p>
                ) : !isLogin ? (
                  <p className="field-hint" id="password-hint">
                    Use at least 8 characters.
                  </p>
                ) : null}
              </div>

              {!isLogin && (
                <div className="field">
                  <label htmlFor="confirmPassword">
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    required
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={
                      errors.confirmPassword
                        ? "confirmPassword-error"
                        : undefined
                    }
                  />

                  {errors.confirmPassword && (
                    <p
                      className="field-error"
                      id="confirmPassword-error"
                    >
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              <button
                className="button primary submit-button"
                type="submit"
                disabled={isSubmitting || !ready}
              >
                {!ready
                  ? "Checking session..."
                  : isSubmitting
                    ? isLogin ? "Logging in..." : "Creating account..."
                    : isLogin
                      ? "Log in"
                      : "Create account"}{" "}
                <Arrow />
              </button>

              <p className="form-note">
                {isLogin
                  ? "Log in to your UF Esports Hub account."
                  : "Create your account to join the UF Esports Hub."}
              </p>

              <p className="form-status" role="status">
                {message}
              </p>
            </form>

            <p className="auth-switch">
              {isLogin
                ? "New to the hub?"
                : "Already part of the community?"}{" "}

              <a href={isLogin ? "/register" : "/login"}>
                {isLogin ? "Create an account" : "Log in"}{" "}
                <Arrow />
              </a>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main className="landing">
      <div className="hero-topline">
        <span className="eyebrow">
          <span /> THE UF ESPORTS HUB
        </span>

        <span className="hero-edition">
          GAINESVILLE, FL / EST. AT UF
        </span>
      </div>

      <section className="hero">
        <p className="hero-kicker">
          BUILT FOR THE GATOR IN YOU.
        </p>

        <h1>
          Find your people.
          <br />
          <span>Play your game.</span>
        </h1>

        <p className="hero-description">
          A home for the UF esports community.
          <br />
          Your next chapter starts here.
        </p>

        <a className="button primary" href="/register">
          Join the hub <Arrow />
        </a>

        <div className="hero-art" aria-hidden="true">
          <div className="art-line line-one" />
          <div className="art-line line-two" />
          <div className="art-line line-three" />
          <span>UF</span>
          <div className="art-caption">
            ESPORTS / FLORIDA
          </div>
        </div>
      </section>

      <div className="landing-bottom">
        <span className="small-cross">+</span>
        <span>ONE CAMPUS. EVERY GAME.</span>

        <a href="/register">
          YOUR PLACE STARTS HERE <Arrow back />
        </a>
      </div>
    </main>
  );
}

export function App() {
  const { session, ready, notice, logout } = useAuth();
  const pathname =
    window.location.pathname.replace(/\/+$/, "") || "/";

  const isRegister = pathname === "/register";
  const isLogin = pathname === "/login";

  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />

        <nav aria-label="Main navigation">
          <a
            className={
              !isRegister && pathname === "/"
                ? "nav-link active"
                : "nav-link"
            }
            aria-current={
              pathname === "/" ? "page" : undefined
            }
            href="/"
          >
            Home
          </a>

          {session ? (
            <>
              <span className="nav-user">Signed in as {session.user.username}</span>
              <button className="nav-register logout-button" type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <a
                className={
                  isLogin ? "nav-link active" : "nav-link"
                }
                href="/login"
                aria-current={
                  isLogin ? "page" : undefined
                }
              >
                Log in
              </a>

              <a
                className="nav-register"
                href="/register"
                aria-current={
                  isRegister ? "page" : undefined
                }
              >
                Join the hub <Arrow back />
              </a>
            </>
          )}
        </nav>
      </header>

      {notice && <p className="session-notice" role="status">{notice}</p>}

      {isRegister || isLogin ? (
        <AuthPage
          key={pathname}
          mode={isLogin ? "login" : "register"}
          session={session}
          ready={ready}
        />
      ) : pathname === "/" ? (
        <Landing />
      ) : (
        <main className="not-found">
          <p className="eyebrow">
            404 / OUT OF BOUNDS
          </p>

          <h1>This page isn’t in play.</h1>

          <a className="button primary" href="/">
            Back to home <Arrow />
          </a>
        </main>
      )}

      <footer className="site-footer">
        <span>UF ESPORTS HUB</span>
        <span>
          Made for the game. Built for the community.
        </span>
        <span>
          GO GATORS <span className="blue-dot">●</span>
        </span>
      </footer>
    </div>
  );
}

export default App;
