import { Arrow } from "../components/ui/Arrow";

export function HomePage() {
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

