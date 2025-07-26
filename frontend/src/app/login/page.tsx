"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@components/auth-layout";
import { LoginForm } from "@components/login-form";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </div>
  );
}
