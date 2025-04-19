"use client"; // Need client-side hooks

import { useAuth } from "@/context/AuthContext"; // Adjust path if needed
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react"; // Import Suspense

function CallbackComponent() {
  const searchParams = useSearchParams(); // Hook to read query params
  const router = useRouter();
  const { login } = useAuth(); // Get the login function from context

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      // Found token - call login function from context
      login(token)
        .then(() => {
          // Redirect to dashboard or home page after successful login/profile fetch
          router.push("/dashboard"); // Or '/' or wherever appropriate
        })
        .catch((err) => {
          console.error("Login failed:", err);
          // Redirect to an error page or login page
          router.push("/login/failure");
        });
    } else {
      // No token found in URL, redirect to login or show error
      console.error("No token found in callback URL");
      router.push("/login/failure"); // Or just '/'
    }
    // Run only once when searchParams are available
  }, [searchParams, login, router]);

  return <div>Loading... Please wait.</div>; // Show a loading message
}

// Wrap the component with Suspense for useSearchParams
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading callback...</div>}>
      <CallbackComponent />
    </Suspense>
  );
}
