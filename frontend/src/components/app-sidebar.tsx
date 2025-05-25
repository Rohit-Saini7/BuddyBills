"use client";

import * as React from "react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto } from "@/types";
import BackendStatus from "@components/BackendStatus";
import { NavItems } from "@components/nav-items";
import { deleteToastId, leaveToastId, restoreToastId } from "@utils/constants";
import { Wallet2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const fetcher = (url: string) => apiClient.get<GroupResponseDto[]>(url);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user, logout } = useAuth();
  const { mutate } = useSWRConfig();

  const activeGroupsApiUrl = "/groups";
  const deletedGroupsApiUrl = "/groups/deleted/mine";
  const { data: groups } = useSWR(
    !isAuthLoading ? activeGroupsApiUrl : null,
    fetcher
  );

  const { data: deletedGroups } = useSWR(
    !isAuthLoading ? deletedGroupsApiUrl : null,
    fetcher
  );

  React.useEffect(() => {
    const handleContextmenu = (e: { preventDefault: () => void }) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextmenu);
    return function cleanup() {
      document.removeEventListener("contextmenu", handleContextmenu);
    };
  }, []);

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

  //* --- NEW Handler for Deleting Group ---
  const deleteGroup = React.useCallback(
    async (group: GroupResponseDto) => {
      if (!group) return;

      toast.loading("Deleting group, please wait.", {
        id: deleteToastId,
        description: "",
        dismissible: false,
      });

      try {
        await apiClient.delete(`/groups/${group.id}`);

        toast.success(`Group "${group.name}" deleted successfully.`, {
          id: deleteToastId,
          dismissible: true,
        });

        mutate(activeGroupsApiUrl);
        mutate(deletedGroupsApiUrl);

        router.push("/");
      } catch (error: any) {
        console.error("Failed to delete group:", error);
        toast.error(`Failed to delete group.`, {
          id: deleteToastId,
          description:
            error?.message ?? error?.errorMessage ?? "Could not delete group.",
          dismissible: true,
        });
      }
    },
    [mutate]
  );

  const handleDeleteGroup = React.useCallback(
    (group: GroupResponseDto) => {
      toast("Delete Confirmation", {
        description: `Are you sure you want to delete the group "${group.name}"? This action cannot be easily undone.`,
        closeButton: true,
        action: {
          label: "Delete",
          onClick: () => deleteGroup(group),
        },
      });
    },
    [deleteGroup]
  );

  //* --- NEW Handler for Leaving Group ---
  const leaveGroup = React.useCallback(
    async (group: GroupResponseDto) => {
      if (!group) return;

      toast.loading("Leaving group, please wait.", {
        id: leaveToastId,
        description: "",
        dismissible: false,
      });

      try {
        await apiClient.delete(`/groups/${group.id}/members/me`);

        toast.success(`Group "${group.name}" left successfully.`, {
          id: leaveToastId,
          dismissible: true,
        });

        mutate(activeGroupsApiUrl);
        mutate(deletedGroupsApiUrl);

        router.push("/");
      } catch (error: any) {
        console.error("Failed to leave group:", error);
        toast.error(`Failed to leave group.`, {
          id: leaveToastId,
          description:
            error?.message ?? error?.errorMessage ?? "Could not leave group.",
          dismissible: true,
        });
      }
    },
    [mutate]
  );

  const handleLeaveGroup = React.useCallback(
    (group: GroupResponseDto) => {
      toast("Leave Confirmation", {
        description: `Are you sure you want to leave the group "${group.name}"? This action cannot be easily undone.`,
        closeButton: true,
        action: {
          label: "Leave",
          onClick: () => leaveGroup(group),
        },
      });
    },
    [leaveGroup]
  );

  if (!isAuthenticated) {
    return;
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Wallet2 className="!size-5" />
                <span className="text-base font-semibold">BuddyBills</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavItems
          user={user}
          groups={groups ?? []}
          deletedGroups={deletedGroups ?? []}
          handleRestoreGroup={handleRestoreGroup}
          handleDeleteGroup={handleDeleteGroup}
          handleLeaveGroup={handleLeaveGroup}
        />
      </SidebarContent>
      <SidebarFooter>
        {["local"].includes(process.env.NEXT_PUBLIC_ENV ?? "") ? (
          <BackendStatus />
        ) : null}
        {user ? <NavUser user={user} logout={logout} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
