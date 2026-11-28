import { useEffect, useState } from "react";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import { useAuth } from "../features/auth/use-auth";
import { AuthPage } from "../pages/AuthPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PlayerProfilePage } from "../pages/PlayerProfilePage";
import { TeamCreatePage } from "../pages/TeamCreatePage";
import { TeamDetailsPage } from "../pages/TeamDetailsPage";
import { TeamsPage } from "../pages/TeamsPage";
import "../styles/index.css";

const currentPathname = () => window.location.pathname.replace(/\/+$/, "") || "/";

export function App() {
  const { session, ready, notice, logout } = useAuth();
  const [pathname, setPathname] = useState(currentPathname);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProfilePage = pathname === "/profile" || pathname === "/profile/edit";

  useEffect(() => {
    const onPop = () => setPathname(currentPathname());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigateProfile(editing: boolean) {
    const next = editing ? "/profile/edit" : "/profile";
    window.history.pushState({}, "", next);
    setPathname(next);
  }

  let page = <NotFoundPage />;
  if (isAuthPage) {
    page = (
      <AuthPage
        key={pathname}
        mode={pathname === "/login" ? "login" : "register"}
        session={session}
        ready={ready}
      />
    );
  } else if (isProfilePage) {
    page = (
      <PlayerProfilePage
        session={session}
        ready={ready}
        editing={pathname === "/profile/edit"}
        onNavigate={navigateProfile}
      />
    );
  } else if (pathname === "/teams") {
    page = <TeamsPage />;
  } else if (pathname === "/teams/create") {
    page = <TeamCreatePage />;
  } else if (/^\/teams\/[^/]+$/.test(pathname)) {
    page = <TeamDetailsPage />;
  } else if (pathname === "/") {
    page = <HomePage />;
  }

  return (
    <div className="site-shell">
      <SiteHeader pathname={pathname} session={session} onLogout={logout} />
      {notice && <p className="session-notice" role="status">{notice}</p>}
      {page}
      <SiteFooter />
    </div>
  );
}
