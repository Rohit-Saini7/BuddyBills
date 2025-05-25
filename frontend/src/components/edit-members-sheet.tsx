import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import {
  GroupMemberResponseDto,
  GroupResponseDto,
  MemberRemovalType,
} from "@/types";
import { DropdownMenuItem } from "@components/ui/dropdown-menu";
import WrapperSheet from "@components/wrapper-sheet";
import { LoaderIcon, UserRoundPen, UserRoundXIcon } from "lucide-react";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const fetchMembers = (url: string) =>
  apiClient.get<GroupMemberResponseDto[]>(url);

export function AddMemberSheet({ group }: { group: GroupResponseDto }) {
  const { mutate } = useSWRConfig();
  const { user: loggedInUser } = useAuth();

  const [emails, setEmails] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const membersApiUrl = group?.id ? `/groups/${group?.id}/members` : null;
  const {
    data: members,
    error: membersError,
    isLoading: membersLoading,
  } = useSWR(membersApiUrl, fetchMembers);

  const handleRemoveMember = useCallback(
    async (memberUserIdToRemove: string) => {
      if (
        !window.confirm(
          "Are you sure you want to remove this member from the group?"
        )
      ) {
        return;
      }
      if (!group?.id) return;

      setRemovingMemberId(memberUserIdToRemove);
      setEditError(null);

      try {
        await apiClient.delete(
          `/groups/${group?.id}/members/${memberUserIdToRemove}`
        );

        mutate(membersApiUrl);
      } catch (error: any) {
        console.error("Failed to remove member:", error);
        setEditError(`Failed to remove member: ${error.message}`);
      } finally {
        setRemovingMemberId(null);
      }
    },
    [group?.id, mutate, membersApiUrl]
  );

  const handleAddMembers = async () => {
    let canCloseSheet = true;
    if (!emails.trim()) {
      setEditError("Email cannot be Empty.");
      return false;
    }

    if (!group?.id) return false;

    setIsSaving(true);
    setEditError(null);

    try {
      await apiClient.post<GroupMemberResponseDto>(
        `/groups/${group.id}/members`,
        { email: emails }
      );

      mutate(membersApiUrl);
    } catch (error: any) {
      console.error("Failed to add member:", error);
      setEditError(error.message || "Failed to add member.");
      canCloseSheet = false;
    } finally {
      setIsSaving(false);
      return canCloseSheet;
    }
  };

  function handleSheetClose() {
    setEmails("");
    setEditError("");
    setRemovingMemberId("");
  }

  return (
    <WrapperSheet
      trigger={
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <UserRoundPen />
          <span>Edit Members</span>
        </DropdownMenuItem>
      }
      title="Add Member"
      description="Add Email of new Member(s). You can add multiple Members(max 5) by comma separating emails. Hold Save when you're done."
      submitLabel={isSaving ? "Making Changes..." : "Hold to Add"}
      submitFunction={handleAddMembers}
      submitError={editError ?? ""}
      submitLoading={isSaving}
      submitDisable={emails.trim() === group.name}
      submitDelay={1000}
      onClose={handleSheetClose}
    >
      <div className="grid gap-4 px-4">
        <div>
          {!membersLoading && !membersError && members && (
            <ul className="space-y-2 mb-4">
              {members.length === 0 ? (
                <p>No members found.</p>
              ) : (
                members.map((member) => {
                  const isCreator = member.user.id === group.created_by_user_id;
                  const isInactive = !!member.deletedAt;
                  const canRemove =
                    loggedInUser?.id === group.created_by_user_id &&
                    !isCreator &&
                    !isInactive;

                  let statusText = "";
                  if (isInactive) {
                    const date = new Date(
                      member.deletedAt!
                    ).toLocaleDateString();
                    if (
                      member.removalType === MemberRemovalType.LEFT_VOLUNTARILY
                    ) {
                      statusText = `(Left on ${date})`;
                    } else if (
                      member.removalType ===
                      MemberRemovalType.REMOVED_BY_CREATOR
                    ) {
                      statusText = `(Removed on ${date})`;
                    } else {
                      statusText = `(Inactive since ${date})`;
                    }
                  }

                  return (
                    <li
                      key={member.id}
                      className={`flex items-center justify-between space-x-3 p-2 border-b last:border-b-0 ${
                        isInactive ? "opacity-50" : ""
                      }`}
                    >
                      {/* Member Info */}
                      <div className="flex items-center space-x-3 flex-grow min-w-0">
                        {" "}
                        {/* Ensure content doesn't push button out */}
                        <img
                          src={
                            member.user.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              member.user.name || member.user.email
                            )}&background=random`
                          }
                          alt={member.user.name || member.user.email}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="min-w-0 grow">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium truncate block`}>
                              {member.user.name || "Unnamed User"}
                            </span>
                            {isCreator && !isInactive && (
                              <span className="text-xs text-blue-600 font-semibold">
                                (Creator)
                              </span>
                            )}
                            {isInactive && (
                              <span className="text-xs text-gray-500 italic block">
                                {statusText}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm text-gray-500 truncate block`}
                          >
                            {member.user.email}
                          </span>
                        </div>
                      </div>
                      {/* Remove Button */}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          disabled={removingMemberId === member.user.id}
                          className="p-1 text-red-500 rounded hover:bg-red-100 disabled:opacity-50 flex-shrink-0"
                          title={`Remove ${
                            member.user.name || member.user.email
                          }`}
                          aria-label={`Remove ${
                            member.user.name || member.user.email
                          }`}
                        >
                          {removingMemberId === member.user.id ? (
                            <LoaderIcon />
                          ) : (
                            <UserRoundXIcon />
                          )}
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Email
          </Label>
          <Input
            id="name"
            placeholder="friend@mail.com"
            className="col-span-3"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            disabled={isSaving}
            maxLength={100}
          />
        </div>
      </div>
      {/* --- Members Section (Old Form) --- */}
      {/* <div className="p-4 border rounded bg-white shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Members</h2>
          {loggedInUser?.id !== group.created_by_user_id &&
            members?.find(
              (m) => m.user.id === loggedInUser?.id && !m.deletedAt
            ) && (
              <button
                onClick={handleLeaveGroup}
                disabled={isLeavingGroup}
                className="p-1 px-3 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {isLeavingGroup ? "Leaving..." : "Leave Group"}
              </button>
            )}
        </div>
        {leaveGroupError && (
          <p className="text-red-500 mb-2 text-sm">{leaveGroupError}</p>
        )}
        {removeMemberError && (
          <p className="text-red-500 mb-2 text-sm">{removeMemberError}</p>
        )}

        {membersLoading && <p>Loading members...</p>}
        {membersError && (
          <p className="text-red-500">
            Error loading members: {membersError.message}
          </p>
        )}
        {!membersLoading && !membersError && members && (
          <ul className="space-y-2 mb-4">
            {members.length === 0 ? (
              <p>No members found.</p>
            ) : (
              members.map((member) => {
                const isCreator = member.user.id === group.created_by_user_id;
                const isInactive = !!member.deletedAt;
                const canRemove =
                  loggedInUser?.id === group.created_by_user_id &&
                  !isCreator &&
                  !isInactive;

                let statusText = "";
                if (isInactive) {
                  const date = new Date(member.deletedAt!).toLocaleDateString();
                  if (
                    member.removalType === MemberRemovalType.LEFT_VOLUNTARILY
                  ) {
                    statusText = `(Left on ${date})`;
                  } else if (
                    member.removalType === MemberRemovalType.REMOVED_BY_CREATOR
                  ) {
                    statusText = `(Removed on ${date})`;
                  } else {
                    statusText = `(Inactive since ${date})`;
                  }
                }

                return (
                  <li
                    key={member.id}
                    className={`flex items-center justify-between space-x-3 p-2 border-b last:border-b-0 ${
                      isInactive ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-grow min-w-0">
                      {" "}
                      <img
                        src={
                          member.user.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            member.user.name || member.user.email
                          )}&background=random`
                        }
                        alt={member.user.name || member.user.email}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span
                          className={`font-medium ${
                            isInactive ? "line-through" : ""
                          } truncate block`}
                        >
                          {member.user.name || "Unnamed User"}
                        </span>
                        <span
                          className={`text-sm text-gray-500 ${
                            isInactive ? "line-through" : ""
                          } truncate block`}
                        >
                          {member.user.email}
                        </span>
                        {isCreator && !isInactive && (
                          <span className="text-xs text-blue-600 font-semibold">
                            {" "}
                            (Creator)
                          </span>
                        )}
                        {isInactive && (
                          <span className="text-xs text-gray-500 italic block">
                            {statusText}
                          </span>
                        )}
                      </div>
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member.user.id)}
                        disabled={removingMemberId === member.user.id}
                        className="p-1 text-red-500 rounded hover:bg-red-100 disabled:opacity-50 flex-shrink-0"
                        title={`Remove ${
                          member.user.name || member.user.email
                        }`}
                        aria-label={`Remove ${
                          member.user.name || member.user.email
                        }`}
                      >
                        {removingMemberId === member.user.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
        <form onSubmit={handleAddMember} className="mt-4 pt-4 border-t">
          <h3 className="text-md font-semibold mb-2">Add New Member</h3>
          <div className="flex space-x-2">
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Enter member's email"
              className="flex-grow p-2 border rounded"
              disabled={isAddingMember}
              required
            />
            <button
              type="submit"
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              disabled={isAddingMember || !memberEmail.trim()}
            >
              {isAddingMember ? "Adding..." : "Add Member"}
            </button>
          </div>
          {addMemberError && (
            <p className="text-red-500 mt-2">{addMemberError}</p>
          )}
        </form>
      </div> */}
    </WrapperSheet>
  );
}
