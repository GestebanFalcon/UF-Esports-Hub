import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getMyProfile, saveMyProfile, validateProfile, ProfileApiError, type PlayerProfile, type ProfileEdits, type ProfileErrors, type ProfileField } from "./playerProfileApi";
import "./PlayerProfile.css";

const editsOf = (p: PlayerProfile): ProfileEdits => ({
  displayName: p.displayName, favoriteGame: p.favoriteGame, bio: p.bio,
});

export function PlayerProfilePages() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [draft, setDraft] = useState<ProfileEdits>({ displayName: "", favoriteGame: "", bio: "" });
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "missing" | "error">("loading");
  const [editing, setEditing] = useState(window.location.pathname.endsWith("/edit"));
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading"); setError("");
    try {
      const loaded = await getMyProfile(signal);
      if (signal?.aborted) return;
      setProfile(loaded); setDraft(editsOf(loaded)); setStatus("ready");
    } catch (err) {
      if (signal?.aborted) return;
      setProfile(null);
      setStatus(err instanceof ProfileApiError && err.status === 401 ? "unauthenticated"
        : err instanceof ProfileApiError && err.status === 404 ? "missing" : "error");
      setError(err instanceof Error ? err.message : "Unable to load player profile.");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    const onPop = () => { setEditing(window.location.pathname.endsWith("/edit")); setFieldErrors({}); setMessage(""); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(edit: boolean) {
    if (saving) return;
    if (!edit && profile) setDraft(editsOf(profile));
    setEditing(edit); setMessage(""); setError(""); setFieldErrors({});
    window.history.pushState({}, "", edit ? "/profile/edit" : "/profile");
  }
  function setField(field: ProfileField, value: string) {
    setDraft(previous => ({ ...previous, [field]: value }));
    setFieldErrors(previous => ({ ...previous, [field]: undefined }));
    setError(""); setMessage("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || status !== "ready") return;
    const next = {
      displayName: draft.displayName.trim(), favoriteGame: draft.favoriteGame.trim(), bio: draft.bio.trim(),
    };
    const errors = validateProfile(next);
    setFieldErrors(errors); setMessage(""); setError("");
    if (Object.keys(errors).length) {
      document.getElementById("player-" + Object.keys(errors)[0])?.focus();
      return;
    }
    setSaving(true);
    try {
      const updated = await saveMyProfile(next);
      setProfile(updated); setDraft(editsOf(updated)); setEditing(false);
      setStatus("ready");
      setMessage("Your player profile was saved to your account.");
      window.history.pushState({}, "", "/profile");
    } catch (err) {
      if (err instanceof ProfileApiError) {
        setFieldErrors(err.fieldErrors);
        if (err.status === 401) setStatus("unauthenticated");
        else if (err.status === 404) setStatus("missing");
      }
      setError(err instanceof Error ? err.message : "Could not save profile.");
      // Never discard draft input on failed saves.
    } finally { setSaving(false); }
  }

  const preview = editing ? draft : profile;
  return (
    <main className="player-page">
      <div className="player-page-heading">
        <p className="section-number">PLAYER PROFILE / UF ESPORTS</p>
        <h1>{editing ? "Edit player profile" : "Player profile"}<span>.</span></h1>
        <p>View and manage your account-linked player identity.</p>
      </div>
      {status === "loading" ? <section className="player-panel" role="status" aria-live="polite"><h2>Loading your profile…</h2></section>
      : status !== "ready" ? <section className="player-panel" role="alert">
          <h2>{status === "unauthenticated" ? "Sign in required" : status === "missing" ? "Profile unavailable" : "Unable to load profile"}</h2>
          <p className="player-description">{error}</p>
          {status === "unauthenticated" ? <a className="button primary" href="/login">Go to login</a>
            : <button type="button" className="button primary" onClick={() => void load()}>Try again</button>}
        </section>
      : <div className="player-columns">
        <section className="player-summary" aria-label="Player profile details">
          <div className="player-avatar" aria-hidden="true">{preview?.displayName.trim().slice(0, 2).toUpperCase() || "UF"}</div>
          <p className="section-number">PLAYER CARD</p>
          <h2>{preview?.displayName || "New player"}</h2>
          <p className="player-game">{preview?.favoriteGame || "Favorite game not added"}</p>
          <p className="player-bio">{preview?.bio || "No bio yet."}</p>
        </section>
        <section className="player-panel">
          {editing ? <>
            <h2>Customize your profile</h2>
            <form onSubmit={event => void save(event)} noValidate>
              {(["displayName", "favoriteGame", "bio"] as const).map(field => <div className="field" key={field}>
                <label htmlFor={"player-" + field}>{field === "displayName" ? "Display name *" : field === "favoriteGame" ? "Favorite game" : "Bio"}</label>
                {field === "bio" ?
                  <textarea id={"player-" + field} rows={5} maxLength={300} value={draft[field]} onChange={event => setField(field, event.target.value)} aria-invalid={!!fieldErrors[field]} aria-describedby={fieldErrors[field] ? "error-" + field : undefined} disabled={saving} />
                  : <input id={"player-" + field} value={draft[field]} maxLength={field === "displayName" ? 50 : 60} required={field === "displayName"} onChange={event => setField(field, event.target.value)} aria-invalid={!!fieldErrors[field]} aria-describedby={fieldErrors[field] ? "error-" + field : undefined} disabled={saving} />}
                {fieldErrors[field] && <p className="field-error" id={"error-" + field}>{fieldErrors[field]}</p>}
              </div>)}
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="player-buttons">
                <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
                <button className="player-secondary" type="button" onClick={() => navigate(false)} disabled={saving}>Discard changes</button>
              </div>
            </form>
          </> : <>
            <p className="section-number">ABOUT THIS PLAYER</p>
            <h2>Your player details</h2>
            <p className="player-description">Your saved profile is loaded from your account. Changes are only confirmed after the server saves them.</p>
            <button className="button primary" type="button" onClick={() => navigate(true)}>Edit profile <span aria-hidden="true">→</span></button>
            {message && <p className="player-success" role="status">{message}</p>}
          </>}
        </section>
      </div>}
    </main>
  );
}
