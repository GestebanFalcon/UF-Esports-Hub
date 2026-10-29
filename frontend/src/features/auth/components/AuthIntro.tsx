import type { AuthMode } from "../types";

export function AuthIntro({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";

  return (
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
  );
}
