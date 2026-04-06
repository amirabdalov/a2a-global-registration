import { createContext, useContext, useState, useEffect } from "react";
import { getSessionToken, clearSession } from "./queryClient";

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  kycStatus: string;
  referralCode: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from cookie on page load
  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then(res => {
        if (res.ok) return res.json();
        clearSession();
        return null;
      })
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
