import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
  } from "react";
  import type { ReactNode } from "react";
  import * as db from "@/lib/db";
  import type { NewUserInput, PublicUser, User } from "@/lib/types";
  
  // Ensure the admin account exists before anything reads the session.
  db.ensureInit();
  
  type AuthErrorKey = string | null;
  
  type AuthContextValue = {
    user: PublicUser | null;
    login: (username: string, password: string) => AuthErrorKey;
    register: (input: NewUserInput) => AuthErrorKey;
    logout: () => void;
    refresh: () => void;
  };
  
  const AuthContext = createContext<AuthContextValue | null>(null);
  
  function toPublic(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(() => {
      const session = db.getSession();
      if (!session) return null;
      const found = db.getUserById(session.userId);
      return found ? toPublic(found) : null;
    });
  
    const login = useCallback((username: string, password: string): AuthErrorKey => {
      const found = db.verifyCredentials(username, password);
      if (!found) return "auth.invalidCredentials";
      db.setSession(found.id);
      setUser(toPublic(found));
      return null;
    }, []);
  
    const register = useCallback((input: NewUserInput): AuthErrorKey => {
      const username = input.username.trim().toLowerCase();
      if (!db.USERNAME_RE.test(username)) return "auth.usernameInvalid";
      if (db.BLOCKED_USERNAMES.includes(username)) return "auth.usernameCountry";
      if (db.usernameExists(username)) return "auth.usernameTaken";
      if (input.password.length < 6) return "auth.passwordShort";
      const created = db.createUser({ ...input, username });
      db.setSession(created.id);
      setUser(toPublic(created));
      return null;
    }, []);
  
    const logout = useCallback(() => {
      db.setSession(null);
      setUser(null);
    }, []);
  
    const refresh = useCallback(() => {
      const session = db.getSession();
      if (!session) {
        setUser(null);
        return;
      }
      const found = db.getUserById(session.userId);
      setUser(found ? toPublic(found) : null);
    }, []);
  
    const value = useMemo(
      () => ({ user, login, register, logout, refresh }),
      [user, login, register, logout, refresh],
    );
  
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  
  // eslint-disable-next-line react-refresh/only-export-components
  export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  }
  
