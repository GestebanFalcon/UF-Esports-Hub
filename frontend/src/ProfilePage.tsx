import { useState, type FormEvent } from "react";
import "./index.css";

type Profile = { displayName: string; favoriteGame: string; bio: string };
const STORAGE_KEY = "uf-esports-hub:profile-preview:v1";
const emptyProfile: Profile = { displayName: "", favoriteGame: "", bio: "" };

function readProfile(): Profile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...emptyProfile };
    const data: unknown = JSON.parse(stored);
    if (!data || typeof data !== "object") return { ...emptyProfile };
    const item = data as Record<string, unknown>;
    return {
      displayName: typeof item.displayName === "string" ? item.displayName.slice(0, 50) : "",
      favoriteGame: typeof item.favoriteGame === "string" ? item.favoriteGame.slice(0, 60) : "",
      bio: typeof item.bio === "string" ? item.bio.slice(0, 300) : "",
    };
  } catch {
    return { ...emptyProfile };
  }
}

export function ProfilePage() {
  const [saved, setSaved] = useState<Profile>(readProfile);
  const [draft, setDraft] = useState<Profile>(saved);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const changed = JSON.stringify(saved) !== JSON.stringify(draft);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    const next = {
      displayName: draft.displayName.trim(),
      favoriteGame: draft.favoriteGame.trim(),
      bio: draft.bio.trim(),
    };
    if (!next.displayName) {
      setError("Please enter a display name.");
      document.getElementById("profile-display-name")?.focus();
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      setDraft(next);
      setStatus("Profile saved in this browser.");
    } catch {
      setError("Browser storage is unavailable. Your changes were not saved.");
    }
  }

  function discard() {
    setDraft(saved);
    setError("");
    setStatus("Unsaved changes discarded.");
  }

  return (
    <main className="profile-layout">
      <div className="profile-header">
        <p className="section-number">03 — PLAYER PROFILE</p>
        <h1>Make it <span>yours.</span></h1>
        <p>Customize how your player profile looks.</p>
      </div>
      <div className="profile-columns">
        <section className="profile-card" aria-label="Profile preview">
          <p className="section-number">LIVE PREVIEW</p>
          <div className="profile-avatar" aria-hidden="true">
            {draft.displayName.trim().slice(0, 2).toUpperCase() || "UF"}
          </div>
          <h2>{draft.displayName.trim() || "Your display name"}</h2>
          <p className="profile-game">{draft.favoriteGame.trim() || "Choose your favorite game"}</p>
          <p className="profile-bio">{draft.bio.trim() || "Tell the esports community about yourself."}</p>
        </section>
        <section className="profile-editor" aria-labelledby="profile-editor-title">
          <h2 id="profile-editor-title">Edit profile</h2>
          <p className="profile-notice">Preview mode: saving keeps these details only in this browser on this device. It does not update a user account or server.</p>
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="profile-display-name">Display name *</label>
              <input id="profile-display-name" name="displayName" required maxLength={50}
                value={draft.displayName} onChange={(event) => { setDraft({ ...draft, displayName: event.target.value }); setStatus(""); }}
                placeholder="Your gamer tag" aria-invalid={!!error && !draft.displayName.trim()} />
            </div>
            <div className="field">
              <label htmlFor="profile-game">Favorite game</label>
              <input id="profile-game" name="favoriteGame" maxLength={60}
                value={draft.favoriteGame} onChange={(event) => { setDraft({ ...draft, favoriteGame: event.target.value }); setStatus(""); }}
                placeholder="e.g. Valorant" />
            </div>
            <div className="field">
              <label htmlFor="profile-bio">Bio</label>
              <textarea id="profile-bio" name="bio" maxLength={300} rows={5}
                value={draft.bio} onChange={(event) => { setDraft({ ...draft, bio: event.target.value }); setStatus(""); }}
                placeholder="Your team, role, or what you like to play" />
              <p className="field-hint">{draft.bio.length}/300 characters</p>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            {status && <p className="form-status" role="status">{status}</p>}
            <div className="profile-actions">
              <button className="button primary" type="submit" disabled={!changed}>Save changes →</button>
              <button className="profile-discard" type="button" onClick={discard} disabled={!changed}>Discard changes</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
