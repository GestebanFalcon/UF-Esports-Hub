import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import { useAuth } from "../features/auth/use-auth";
import { AuthPage } from "../pages/AuthPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import "../styles/index.css";

export function App() {
  const { session, ready, notice, logout } = useAuth();
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <div className="site-shell">
      <SiteHeader pathname={pathname} session={session} onLogout={logout} />
      {notice && <p className="session-notice" role="status">{notice}</p>}
      {isAuthPage ? (
        <AuthPage key={pathname} mode={pathname === "/login" ? "login" : "register"} session={session} ready={ready} />
      ) : pathname === "/" ? <HomePage /> : <NotFoundPage />}
      <SiteFooter />
    </div>
  );
}
