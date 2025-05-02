"use client";

import { useRouter } from "next/navigation";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiClient } from "@/lib/apiClient";
interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  createdAt?: Date;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);

    router.push("/");
    setIsLoading(false);
  }, [router]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const userData: User = await apiClient.get<User>("/users/me");
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      logout();
    }
  }, [logout]);

  const login = useCallback(
    async (newToken: string) => {
      setIsLoading(true);
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
      await fetchUserProfile();
      setIsLoading(false);
    },
    [fetchUserProfile]
  );

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
      await fetchUserProfile();
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [fetchUserProfile]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        token,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
