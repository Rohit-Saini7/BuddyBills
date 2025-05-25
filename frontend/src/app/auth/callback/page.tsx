"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function CallbackComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      login(token)
        .then(() => {
          router.push("/");
        })
        .catch((err) => {
          console.error("Login failed:", err);
          router.push("/login/failure");
        });
    } else {
      console.error("No token found in callback URL");
      router.push("/login/failure");
    }
  }, [searchParams, login, router]);

  return <div>Loading... Please wait.</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading callback...</div>}>
      <CallbackComponent />
    </Suspense>
  );
}
