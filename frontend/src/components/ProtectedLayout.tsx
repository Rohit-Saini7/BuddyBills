"use client";

import { useAuth } from "@/context/AuthContext";
import Home from "@components/HomePage";
import LoadingCard from "@components/LoadingCard";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/") {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated) {
    return <Home />;
  } else if (isLoading) {
    return <LoadingCard />;
  }

  return <>{children}</>;
}
