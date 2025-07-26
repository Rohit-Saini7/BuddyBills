import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LinkAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayInfo, setDisplayInfo] = useState({
    name: "",
    provider: "",
    existingProviders: [] as string[],
  });
  const [linkingToken, setLinkingToken] = useState<string | null>(null);

  useEffect(() => {
    const name = searchParams.get("name");
    const provider = searchParams.get("provider");
    const token = searchParams.get("token");
    const existing = searchParams.get("existingProviders");

    if (name && existing && provider && token) {
      setDisplayInfo({
        name,
        provider,
        existingProviders: existing.split(","),
      });
      setLinkingToken(token);
    } else {
      setError("Invalid linking request. Please try logging in again.");
    }
  }, [searchParams]);

  const handleLinkAccount = async () => {
    if (!linkingToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>(
        "/auth/complete-linking",
        {
          token: linkingToken,
        }
      );
      router.push(`/auth/callback?token=${accessToken}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleCancel = () => router.push("/login");

  const formatProviders = (providers: string[]) => {
    if (providers.length === 1) return providers[0];
    if (providers.length === 2) return providers.join(" and ");
    const last = providers.pop()!;
    return `${providers.join(", ")}, and ${last}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-center md:p-8">
      <h1 className="text-2xl font-bold">You're already here.</h1>

      {error ? (
        <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
      ) : (
        <>
          <p className="text-muted-foreground text-balance">
            Hey{" "}
            <span className="font-semibold text-primary">
              {displayInfo.name}
            </span>
            ! Looks like you've signed in with{" "}
            <span className="font-semibold text-primary capitalize">
              {formatProviders(displayInfo.existingProviders)}
            </span>{" "}
            before.
          </p>
          <p className="text-muted-foreground">
            Connect your{" "}
            <span className="font-semibold capitalize text-primary">
              {displayInfo.provider}
            </span>{" "}
            login to it?
          </p>
        </>
      )}

      <div className="flex flex-col gap-4 pt-4">
        <Button
          onClick={handleLinkAccount}
          disabled={isLoading || !!error || !linkingToken}
        >
          {isLoading ? "Connecting..." : "Yep, Connect Them"}
        </Button>
        <Button onClick={handleCancel} disabled={isLoading} variant="outline">
          No Thanks
        </Button>
      </div>
    </div>
  );
}
