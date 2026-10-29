import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PlayerProfilePages } from "./PlayerProfilePages";
import "./PlayerProfileShortcut.css";

function ProfileShell() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="UF Esports Hub home">
          <span className="brand-mark" aria-hidden="true">UF<span /></span>
          <span>ESPORTS<span className="brand-subtitle">UNIVERSITY OF FLORIDA</span></span>
        </a>
        <nav aria-label="Player profile navigation">
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link active" href="/profile" aria-current="page">Player profile</a>
        </nav>
      </header>
      <PlayerProfilePages />
      <footer className="site-footer">
        <span>UF ESPORTS HUB</span>
        <span>Made for the game. Built for the community.</span>
        <span>GO GATORS</span>
      </footer>
    </div>
  );
}

function start() {
  const root = createRoot(document.getElementById("root")!);
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  root.render(path === "/profile" || path === "/profile/edit"
    ? <ProfileShell />
    : <><App /><a className="player-profile-shortcut" href="/profile">Player profile</a></>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
