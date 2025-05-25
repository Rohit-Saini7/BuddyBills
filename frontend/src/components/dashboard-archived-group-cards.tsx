import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto } from "@/types";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import { restoreToastId } from "@utils/constants";
import { ArchiveRestoreIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const fetcher = (url: string) => apiClient.get<GroupResponseDto[]>(url);

export function ArchivedGroupCards() {
  const { isLoading: isAuthLoading } = useAuth();
  const { mutate } = useSWRConfig();

  const activeGroupsApiUrl = "/groups";

  const deletedGroupsApiUrl = "/groups/deleted/mine";

  //* --- Restore Group Handler ---
  const handleRestoreGroup = React.useCallback(
    async (groupId: string) => {
      toast.loading("Restoring group, please wait.", {
        id: restoreToastId,
        description: "",
        dismissible: false,
      });
      try {
        await apiClient.patch(`/groups/${groupId}/restore`, {});
        toast.success(`Group restored successfully.`, {
          id: restoreToastId,
          dismissible: true,
        });

        mutate(activeGroupsApiUrl);
        mutate(deletedGroupsApiUrl);
      } catch (error: any) {
        console.error("Failed to restore group:", error);
        toast.error(`Failed to restore group.`, {
          id: restoreToastId,
          description:
            error?.message ?? error?.errorMessage ?? "Could not restore group.",
          dismissible: true,
        });
      }
    },
    [mutate]
  );

  const {
    data: deletedGroups,
    error,
    isLoading,
  } = useSWR(!isAuthLoading ? deletedGroupsApiUrl : null, fetcher);

  if (error) {
    return (
      <p className="text-red-500">
        Error loading archived groups: {error.message}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((e) => (
          <div
            className="flex items-center space-x-4"
            key={"deleted-groups-skeleton-" + e}
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
      {deletedGroups?.map((group) => (
        <Card className="@container/card" key={group.id}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-xl">
              {group.name}
            </CardTitle>
            <CardAction>
              <Button
                variant="outline"
                onClick={() => handleRestoreGroup(group.id)}
              >
                <ArchiveRestoreIcon />
                Restore
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
