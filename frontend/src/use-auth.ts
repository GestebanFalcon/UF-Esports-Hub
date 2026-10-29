import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient } from "./auth";

export function useAuth() {
  const session = useSyncExternalStore(authClient.subscribe, authClient.getSnapshot);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    authClient.restore()
      .catch(() => {
        if (active) setNotice("Could not verify your saved session. Please log in again or reload to retry.");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    setNotice("");
    let timeout: number | undefined;
    const checkExpiration = () => {
      window.clearTimeout(timeout);
      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) {
        authClient.logout();
        setNotice("Your session expired. Please log in again.");
      } else {
        timeout = window.setTimeout(checkExpiration, Math.min(remaining, 2_147_483_647));
      }
    };
    checkExpiration();
    document.addEventListener("visibilitychange", checkExpiration);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", checkExpiration);
    };
  }, [session]);

  return {
    session,
    ready,
    notice,
    logout() {
      authClient.logout();
      setNotice("You have been logged out.");
    },
  };
}
