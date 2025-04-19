"use client"; // This Context will be used in Client Components

import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiClient } from "@/lib/apiClient"; // Import the new client
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
  isLoading: boolean; // To handle initial auth check
  login: (token: string) => Promise<void>; // Make login async
  logout: () => void;
  checkAuth: () => Promise<void>; // Add checkAuth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create API client (we'll refine this)
const getApiClient = (token: string | null) => {
  return {
    get: async (path: string) => {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`,
        { headers }
      );
      if (!res.ok) throw new Error(`API request failed: ${res.status}`);
      return res.json();
    },
    // Add post, patch, delete methods later
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const router = useRouter();

  // Function to handle logout: clear token, user, redirect
  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
    // Redirect to login or home page
    router.push("/"); // Or '/login'
    setIsLoading(false); // Ensure loading is false on logout
  }, [router]);

  // Function to fetch user profile using the token
  const fetchUserProfile = useCallback(
    async (currentToken: string) => {
      // No need to pass token here, apiClient handles it
      try {
        const userData: User = await apiClient.get<User>("/users/me");
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        logout(); // Logout if fetching fails (token likely invalid)
      }
    },
    [logout]
  ); // Update dependencies if logout changes identity often (it shouldn't with useCallback)

  // Function to handle login: store token, fetch user, update state
  const login = useCallback(
    async (newToken: string) => {
      setIsLoading(true);
      localStorage.setItem("authToken", newToken); // Store token
      setToken(newToken);
      await fetchUserProfile(newToken); // Fetch user profile
      setIsLoading(false);
    },
    [fetchUserProfile]
  ); // Depend on fetchUserProfile

  // Check authentication status on initial load
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
      await fetchUserProfile(storedToken);
    } else {
      setUser(null); // Ensure user is null if no token
    }
    setIsLoading(false);
  }, [fetchUserProfile]); // Depend on fetchUserProfile

  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // Run only once on mount

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

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
