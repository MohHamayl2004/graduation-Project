import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "nipras_auth";

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };

    const parsed = JSON.parse(raw);
    return { user: parsed?.user || null, token: parsed?.token || null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(loadStoredAuth);

  useEffect(() => {
    if (auth?.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const setAuth = (next) => {
    setAuthState(next);
  };

  const login = (user, token) => {
    setAuthState({ user, token });
  };

  const register = (user, token) => {
    setAuthState({ user, token });
  };

  const logout = () => {
    setAuthState({ user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
