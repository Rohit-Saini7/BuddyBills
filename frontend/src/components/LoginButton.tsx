"use client";

import { useAuth } from "../context/AuthContext";

export default function LoginButton() {
  const { isAuthenticated, logout, user } = useAuth();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const googleLoginUrl = `${apiBaseUrl}/auth/google`;

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.name || user?.email}!</span>
        <button
          onClick={logout}
          className="ml-4 p-2 bg-red-500 text-white rounded"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <a href={googleLoginUrl} className="p-2 bg-blue-500 text-white rounded">
      Login with Google
    </a>
  );
}
