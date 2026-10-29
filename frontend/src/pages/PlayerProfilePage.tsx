import type { Session } from "../features/auth/types";
import { PlayerProfile } from "../features/profile/components/PlayerProfile";
import "../features/profile/profile.css";

type PlayerProfilePageProps = {
  session: Session | null;
  ready: boolean;
  editing: boolean;
  onNavigate: (editing: boolean) => void;
};

export function PlayerProfilePage({ session, ready, editing, onNavigate }: PlayerProfilePageProps) {
  return (
    <main className="player-page">
      <div className="player-page-heading">
        <p className="section-number">PLAYER PROFILE / UF ESPORTS</p>
        <h1>{editing ? "Edit player profile" : "Player profile"}<span>.</span></h1>
        <p>View and manage your account-linked player identity.</p>
      </div>
      {!ready ? (
        <section className="player-panel" role="status" aria-live="polite">
          <h2>Checking your session…</h2>
        </section>
      ) : !session ? (
        <section className="player-panel" role="alert">
          <h2>Sign in required</h2>
          <p className="player-description">Sign in to view your player profile.</p>
          <a className="button primary" href="/login">Go to login</a>
        </section>
      ) : <PlayerProfile key={session.user.id} editing={editing} onNavigate={onNavigate} />}
    </main>
  );
}
