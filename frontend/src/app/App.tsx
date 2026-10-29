import { useEffect, useState } from "react";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import { useAuth } from "../features/auth/use-auth";
import { AuthPage } from "../pages/AuthPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PlayerProfilePage } from "../pages/PlayerProfilePage";
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

  return (
    <div className="site-shell">
      <SiteHeader pathname={pathname} session={session} onLogout={logout} />
      {notice && <p className="session-notice" role="status">{notice}</p>}
      {isAuthPage ? (
        <AuthPage key={pathname} mode={pathname === "/login" ? "login" : "register"} session={session} ready={ready} />
      ) : isProfilePage ? (
        <PlayerProfilePage session={session} ready={ready} editing={pathname === "/profile/edit"} onNavigate={navigateProfile} />
      ) : pathname === "/" ? <HomePage /> : <NotFoundPage />}
      <SiteFooter />
    </div>
  );
}
