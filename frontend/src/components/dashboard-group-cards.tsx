import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto } from "@/types";
import { Separator } from "@components/ui/separator";
import { Skeleton } from "@components/ui/skeleton";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => apiClient.get<GroupResponseDto[]>(url);

export function GroupCards() {
  const { isLoading: isAuthLoading } = useAuth();

  const activeGroupsApiUrl = "/groups";
  const {
    data: groups,
    error,
    isLoading,
  } = useSWR(!isAuthLoading ? activeGroupsApiUrl : null, fetcher);

  if (error) {
    return (
      <p className="text-red-500">Error loading groups: {error.message}</p>
    );
  }

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((e) => (
          <div
            className="flex items-center space-x-4"
            key={"groups-skeleton-" + e}
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {groups?.map((group, index) => (
        <Link href={`/groups/${group.id}`} key={group.id} className="h-full">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-xl">
                {group.name}
              </CardTitle>
              <CardDescription className="flex items-center">
                {index} Members {/* //[]: change to actual no of members */}
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4"
                />
                {index % 2 ? "You owe ₹1200." : "You owed ₹1200."}
                {/* //[]: add actual number here */}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
