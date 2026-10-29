import type { Session } from "../../features/auth/types";
import { Arrow } from "../ui/Arrow";
import { Brand } from "./Brand";

type SiteHeaderProps = { pathname: string; session: Session | null; onLogout: () => void };

export function SiteHeader({ pathname, session, onLogout }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Main navigation">
        <a className={pathname === "/" ? "nav-link active" : "nav-link"} href="/" aria-current={pathname === "/" ? "page" : undefined}>
          Home
        </a>
        {session ? (
          <>
            <span className="nav-user">Signed in as {session.user.username}</span>
            <button className="nav-register logout-button" type="button" onClick={onLogout}>Log out</button>
          </>
        ) : (
          <>
            <a className={pathname === "/login" ? "nav-link active" : "nav-link"} href="/login" aria-current={pathname === "/login" ? "page" : undefined}>
              Log in
            </a>
            <a className="nav-register" href="/register" aria-current={pathname === "/register" ? "page" : undefined}>
              Join the hub <Arrow back />
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
