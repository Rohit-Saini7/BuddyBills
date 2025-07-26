"use client";

import { AuthLayout } from "@components/auth-layout";
import { LinkAccountForm } from "@components/link-account-form";

export default function LinkAccountPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <AuthLayout>
        <LinkAccountForm />
      </AuthLayout>
    </div>
  );
}
