// Example: frontend/src/app/dashboard/layout.tsx (or any protected layout)
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is finished before checking auth
    if (!isLoading && !isAuthenticated) {
      router.push("/"); // Redirect to login/home page if not authenticated
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state or nothing while checking auth
  if (isLoading || !isAuthenticated) {
    return <div>Loading user...</div>; // Or a proper loading spinner
  }

  // Render children only if authenticated
  return <>{children}</>;
}

// Now, any page using this layout (like dashboard/page.tsx) will be protected.
