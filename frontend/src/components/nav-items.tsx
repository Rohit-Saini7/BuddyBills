"use client";

import { IconDots, IconTrash } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { User } from "@/context/AuthContext";
import { GroupResponseDto } from "@/types";
import { AddNewGroupSheet } from "@components/add-new-group-sheet";
import { EditGroupSheet } from "@components/edit-group-sheet";
import { AddMemberSheet } from "@components/edit-members-sheet";
import { GroupIcon, LogOutIcon, Undo2 } from "lucide-react";
import Link from "next/link";

export function NavItems({
  user,
  groups,
  deletedGroups,
  handleRestoreGroup,
  handleDeleteGroup,
  handleLeaveGroup,
}: {
  user: User | null;
  groups: GroupResponseDto[];
  deletedGroups: GroupResponseDto[];
  handleRestoreGroup: (groupId: string) => Promise<void>;
  handleDeleteGroup: (group: GroupResponseDto) => void;
  handleLeaveGroup: (group: GroupResponseDto) => void;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu className="mb-2">
        <SidebarMenuItem className="flex items-center gap-2">
          <AddNewGroupSheet />
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarSeparator className="my-2.5" />
      <SidebarGroupLabel>Groups</SidebarGroupLabel>
      <SidebarMenu>
        {groups.map((group) => (
          <SidebarMenuItem key={group.name}>
            <SidebarMenuButton asChild>
              <Link href={`/groups/${group.id}`}>
                <GroupIcon /> {/*  //[]: add group icon functionality */}
                <span>{group.name}</span> {/* //[]: add rename functionality */}
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="data-[state=open]:bg-accent rounded-sm"
                >
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <EditGroupSheet group={group} />
                <AddMemberSheet group={group} />
                <DropdownMenuSeparator />
                {user?.id === group.created_by_user_id ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => handleDeleteGroup(group)}
                  >
                    <IconTrash />
                    <span>Delete Group</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => handleLeaveGroup(group)}
                  >
                    <LogOutIcon />
                    <span>Leave Group</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      {deletedGroups.length ? (
        <>
          <SidebarSeparator className="my-2.5" />
          <SidebarGroupLabel>Deleted Groups</SidebarGroupLabel>
        </>
      ) : null}
      <SidebarMenu>
        {deletedGroups.map((dGroup) => (
          <SidebarMenuItem key={dGroup.name}>
            <SidebarMenuButton asChild>
              <div>
                <GroupIcon /> {/*  //[]: add group icon functionality */}
                <span>{dGroup.name}</span>
              </div>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="data-[state=open]:bg-accent rounded-sm"
                >
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-36 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem
                  className="cursor-pointer font-semibold"
                  variant="constructive"
                  onClick={() => handleRestoreGroup(dGroup.id)}
                >
                  <Undo2 />
                  <span>Restore Group</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {/* <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <IconDots className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
      </SidebarMenu>
    </SidebarGroup>
  );
}
