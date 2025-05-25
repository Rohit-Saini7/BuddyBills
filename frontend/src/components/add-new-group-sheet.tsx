import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto } from "@/types";
import { SidebarMenuButton } from "@components/ui/sidebar";
import WrapperSheet from "@components/wrapper-sheet";
import { IconCirclePlusFilled } from "@tabler/icons-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

export function AddNewGroupSheet() {
  const { mutate } = useSWRConfig();

  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateGroupError("Group name cannot be empty.");
      return;
    }

    setIsCreatingGroup(true);
    setCreateGroupError(null);

    try {
      await apiClient.post<GroupResponseDto>("/groups", { name: newGroupName });

      setNewGroupName("");
      setIsCreatingGroup(false);

      //* --- Trigger re-fetch of the groups list ---

      mutate("/groups");
    } catch (error: any) {
      console.error("Failed to create group:", error);
      setCreateGroupError(
        error.message || "Failed to create group. Please try again."
      );
      setIsCreatingGroup(false);
    }
  };

  return (
    <WrapperSheet
      trigger={
        <SidebarMenuButton
          tooltip="New Group"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear cursor-pointer"
        >
          <IconCirclePlusFilled />
          <span>New Group</span>
        </SidebarMenuButton>
      }
      title="Create New Group"
      description="Add Details for new Group. Click save when you're done."
      submitLabel={isCreatingGroup ? "Creating..." : "Hold to Create"}
      submitFunction={handleCreateGroup}
      submitError={createGroupError ?? ""}
      submitLoading={isCreatingGroup}
      submitDisable={newGroupName.length === 0}
      submitDelay={2000}
    >
      <div className="grid gap-4 px-4 ">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            placeholder="My First Group"
            className="col-span-3"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            disabled={isCreatingGroup}
            maxLength={100}
          />
        </div>
        {/* //[]: add icon selection here */}
      </div>
    </WrapperSheet>
  );
}
