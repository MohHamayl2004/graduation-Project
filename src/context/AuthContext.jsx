import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ user: null, token: null, workspaces: [], currentWorkspace: null });
  const signIn = (response) => setAuth({ user: response.user, token: response.token, workspaces: response.workspaces || [], currentWorkspace: response.currentWorkspace || null });
  const signOut = () => setAuth({ user: null, token: null, workspaces: [], currentWorkspace: null });

  return <AuthContext.Provider value={{ auth, setAuth, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
