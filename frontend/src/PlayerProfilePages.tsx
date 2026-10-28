import { useState, type FormEvent } from "react";
import "./PlayerProfile.css";

type PlayerProfile = {
  displayName: string;
  favoriteGame: string;
  bio: string;
  discord: string;
};
const KEY = "uf-esports-hub:player-profile-preview:v1";
const EMPTY: PlayerProfile = { displayName: "", favoriteGame: "", bio: "", discord: "" };

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...EMPTY };
    const value = parsed as Record<string, unknown>;
    return {
      displayName: typeof value.displayName === "string" ? value.displayName.slice(0, 50) : "",
      favoriteGame: typeof value.favoriteGame === "string" ? value.favoriteGame.slice(0, 60) : "",
      bio: typeof value.bio === "string" ? value.bio.slice(0, 300) : "",
      discord: typeof value.discord === "string" ? value.discord.slice(0, 60) : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function PlayerProfilePages() {
  const [saved, setSaved] = useState<PlayerProfile>(loadProfile);
  const [draft, setDraft] = useState<PlayerProfile>(() => loadProfile());
  const [editing, setEditing] = useState(window.location.pathname.endsWith("/edit"));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setField<K extends keyof PlayerProfile>(key: K, value: PlayerProfile[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  }
  function navigate(edit: boolean) {
    setEditing(edit);
    setDraft({ ...saved });
    setMessage("");
    setError("");
    window.history.pushState({}, "", edit ? "/profile/edit" : "/profile");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated: PlayerProfile = {
      displayName: draft.displayName.trim(),
      favoriteGame: draft.favoriteGame.trim(),
      bio: draft.bio.trim(),
      discord: draft.discord.trim(),
    };
    if (!updated.displayName) {
      setError("Display name is required.");
      document.getElementById("player-display-name")?.focus();
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {
      setError("Browser storage is unavailable. Changes could not be saved.");
      return;
    }
    setSaved(updated);
    setDraft(updated);
    setEditing(false);
    setError("");
    setMessage("Your player profile was saved in this browser.");
    window.history.pushState({}, "", "/profile");
  }

  return (
    <main className="player-page">
      <div className="player-page-heading">
        <p className="section-number">PLAYER PROFILE / UF ESPORTS</p>
        <h1>{editing ? "Edit player profile" : "Player profile"}<span>.</span></h1>
        <p>Show your gamer identity and your favorite game.</p>
      </div>
      <p className="player-local-note">Profile preview: information is saved only in this browser, not in a UF Esports account or database. Please do not enter sensitive information.</p>
      <div className="player-columns">
        <section className="player-summary" aria-label="Player profile details">
          <div className="player-avatar" aria-hidden="true">{(editing ? draft : saved).displayName.trim().slice(0, 2).toUpperCase() || "UF"}</div>
          <p className="section-number">PLAYER CARD</p>
          <h2>{(editing ? draft : saved).displayName.trim() || "New player"}</h2>
          <p className="player-game">{(editing ? draft : saved).favoriteGame.trim() || "Favorite game not added"}</p>
          <p className="player-bio">{(editing ? draft : saved).bio.trim() || "No bio yet. Tell other players about yourself."}</p>
          {(editing ? draft : saved).discord.trim() && <p className="player-discord">Discord: {(editing ? draft : saved).discord.trim()}</p>}
        </section>
        <section className="player-panel">
          {editing ? (
            <>
              <h2>Customize your profile</h2>
              <form onSubmit={save}>
                <div className="field">
                  <label htmlFor="player-display-name">Display name *</label>
                  <input id="player-display-name" required maxLength={50} value={draft.displayName} onChange={e => setField("displayName", e.target.value)} placeholder="Your gamer tag" aria-invalid={!!error && !draft.displayName.trim()} />
                </div>
                <div className="field">
                  <label htmlFor="player-favorite-game">Favorite game</label>
                  <input id="player-favorite-game" maxLength={60} value={draft.favoriteGame} onChange={e => setField("favoriteGame", e.target.value)} placeholder="e.g. Rocket League" />
                </div>
                <div className="field">
                  <label htmlFor="player-discord">Discord username</label>
                  <input id="player-discord" maxLength={60} value={draft.discord} onChange={e => setField("discord", e.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="player-bio">Bio</label>
                  <textarea id="player-bio" rows={5} maxLength={300} value={draft.bio} onChange={e => setField("bio", e.target.value)} placeholder="Introduce yourself to the community" />
                  <p className="field-hint">{draft.bio.length}/300 characters</p>
                </div>
                {error && <p role="alert" className="field-error">{error}</p>}
                <div className="player-buttons">
                  <button className="button primary" type="submit">Save profile <span aria-hidden="true">→</span></button>
                  <button className="player-secondary" type="button" onClick={() => navigate(false)}>Cancel</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className="section-number">ABOUT THIS PLAYER</p>
              <h2>{saved.displayName ? "Your player details" : "Create your player card"}</h2>
              <p className="player-description">{saved.displayName ? "Your current player profile is shown on the left. Edit it to update your details." : "Add a display name, favorite game, Discord username, and bio to get started."}</p>
              <button className="button primary" type="button" onClick={() => navigate(true)}>{saved.displayName ? "Edit profile" : "Set up profile"} <span aria-hidden="true">→</span></button>
              {message && <p className="player-success" role="status">{message}</p>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
