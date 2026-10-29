import { Arrow } from "../components/ui/Arrow";
import { AuthForm } from "../features/auth/components/AuthForm";
import { AuthIntro } from "../features/auth/components/AuthIntro";
import type { AuthMode, Session } from "../features/auth/types";

type AuthPageProps = { mode: AuthMode; session: Session | null; ready: boolean };

export function AuthPage({ mode, session, ready }: AuthPageProps) {
  const isLogin = mode === "login";

  return (
    <main className="register-layout">
      <AuthIntro mode={mode} />
      <section className="form-panel" aria-labelledby="auth-title">
        <div className="form-heading">
          <span className="section-number">{isLogin ? "02 — WELCOME BACK" : "01 — JOIN THE HUB"}</span>
          <h2 id="auth-title">
            {isLogin ? "Log in to the hub" : "Create your account"}<span>.</span>
          </h2>
          <p>{isLogin ? "Pick up where you left off." : "Your community. Your next team. Start here."}</p>
        </div>
        {session ? (
          <div className="signed-in" role="status">
            <p>Welcome, {session.user.username}. You are logged in.</p>
            <a className="button primary" href="/">Go to home <Arrow /></a>
          </div>
        ) : <AuthForm mode={mode} ready={ready} />}
      </section>
    </main>
  );
}
