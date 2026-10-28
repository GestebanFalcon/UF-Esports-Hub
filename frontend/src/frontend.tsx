/** React entry point. Keep the profile route separate from App.tsx so team features can evolve independently. */
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProfilePage } from "./ProfilePage";

function ProfileRoute() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="UF Esports Hub home">
          <span className="brand-mark" aria-hidden="true">UF<span /></span>
          <span>ESPORTS<span className="brand-subtitle">UNIVERSITY OF FLORIDA</span></span>
        </a>
        <nav aria-label="Profile navigation">
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link active" href="/profile" aria-current="page">Profile</a>
        </nav>
      </header>
      <ProfilePage />
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
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  root.render(
    pathname === "/profile"
      ? <ProfileRoute />
      : <>
          <App />
          <a className="profile-shortcut" href="/profile" aria-label="Edit your profile">My profile</a>
        </>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
