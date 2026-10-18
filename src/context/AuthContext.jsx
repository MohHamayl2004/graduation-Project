import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../services/authService";
import { loadSession } from "../../shared/sessionRecovery";

const AuthContext = createContext(null);
const emptyAuth = { user: null, token: null, workspaces: [], currentWorkspace: null, loading: false, sessionError: null };
const storedToken = () => { try { return sessionStorage.getItem("nipras.token"); } catch { return null; } };
const saveToken = (token) => { try { if (token) sessionStorage.setItem("nipras.token", token); else sessionStorage.removeItem("nipras.token"); } catch { /* The active in-memory session still works. */ } };

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => { const token = storedToken(); return { ...emptyAuth, token, loading: Boolean(token) }; });
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const retrySession = () => { setAuth((previous) => ({ ...previous, loading: true, sessionError: null })); setSessionAttempt((attempt) => attempt + 1); };
  const signIn = (response) => {
    saveToken(response.token);
    setAuth({ user: response.user, token: response.token, workspaces: response.workspaces || [], currentWorkspace: response.currentWorkspace || null, loading: false });
  };
  const signOut = () => { saveToken(null); setAuth(emptyAuth); };
  useEffect(() => {
    if (!auth.token) return undefined;
    let cancelled = false;
    let refreshing = false;
    const controller = new AbortController();
    const token = auth.token;
    const refresh = () => {
      if (refreshing) return;
      refreshing = true;
      return loadSession(getMe, token, { signal: controller.signal }).then((response) => {
      if (!cancelled) setAuth({ user: response.user, token, workspaces: response.workspaces || [], currentWorkspace: response.currentWorkspace || null, loading: false });
      }).catch((error) => {
        if (cancelled) return;
        if (error.status === 401 || (error.status === 403 && error.code === "ACCOUNT_INACTIVE")) signOut();
        else setAuth((previous) => ({ ...previous, loading: false, sessionError: "تعذر الاتصال بالخادم لاستعادة جلستك. تأكد من تشغيل المشروع وحاول مرة ثانية." }));
      }).finally(() => { refreshing = false; });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { cancelled = true; controller.abort(); clearInterval(timer); };
  }, [auth.token, sessionAttempt]);

  const updateUser = (user) => setAuth((previous) => ({ ...previous, user }));
  return <AuthContext.Provider value={{ auth, setAuth, signIn, signOut, updateUser, retrySession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
