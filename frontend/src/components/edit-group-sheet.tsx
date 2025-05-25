import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto, UpdateGroupDto } from "@/types";
import { DropdownMenuItem } from "@components/ui/dropdown-menu";
import WrapperSheet from "@components/wrapper-sheet";
import { Edit } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

export function EditGroupSheet({ group }: { group: GroupResponseDto }) {
  const { mutate } = useSWRConfig();
  const groupApiUrl = group.id ? `/groups/${group.id}` : null;

  const [editedGroupName, setEditedGroupName] = useState(group.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGroup = async () => {
    if (!editedGroupName.trim()) {
      setEditError("Group name cannot be empty.");
      return;
    }
    if (!group || editedGroupName.trim() === group.name) {
      setEditError(null);
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const updateData: UpdateGroupDto = { name: editedGroupName.trim() };
      await apiClient.patch<GroupResponseDto>(
        `/groups/${group.id}`,
        updateData
      );

      mutate("/groups");
    } catch (error: any) {
      console.error("Failed to update group name:", error);
      setEditError(error.message || "Could not update group name.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WrapperSheet
      trigger={
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit />
          <span>Edit Group</span>
        </DropdownMenuItem>
      }
      title="Edit Group"
      description="Add Details for new Group. Click save when you're done."
      submitLabel={isSaving ? "Making Changes..." : "Hold to Submit"}
      submitFunction={handleSaveGroup}
      submitError={editError ?? ""}
      submitLoading={isSaving}
      submitDisable={editedGroupName.trim() === group.name}
      submitDelay={2000}
    >
      <div className="grid gap-4 px-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            placeholder="My First Group"
            className="col-span-3"
            value={editedGroupName}
            onChange={(e) => setEditedGroupName(e.target.value)}
            disabled={isSaving}
            maxLength={100}
          />
        </div>
        {/* //[]: add icon selection here */}
      </div>
    </WrapperSheet>
  );
}
