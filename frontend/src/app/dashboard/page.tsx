"use client";

import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { GroupResponseDto } from "@/types";
import ProtectedLayout from "@components/ProtectedLayout";
import Link from "next/link";
import React, { useCallback, useState } from "react"; // Import useState
import useSWR, { useSWRConfig } from "swr"; // Import useSWRConfig

// Fetcher function remains the same
const fetcher = (url: string) => apiClient.get<GroupResponseDto[]>(url);

export default function DashboardPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const { mutate } = useSWRConfig(); // Get the mutate function from SWR config

  // State for the new group form
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [restoringGroupId, setRestoringGroupId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const activeGroupsApiUrl = "/groups";
  const deletedGroupsApiUrl = "/groups/deleted/mine";
  const {
    data: groups,
    error: fetchGroupsError,
    isLoading: isGroupsLoading,
  } = useSWR(!isAuthLoading ? activeGroupsApiUrl : null, fetcher);

  const {
    data: deletedGroups,
    error: fetchDeletedError,
    isLoading: deletedLoading,
  } = useSWR(!isAuthLoading ? deletedGroupsApiUrl : null, fetcher);

  const isLoading = isAuthLoading || isGroupsLoading || deletedLoading;

  // --- Handler for creating a new group ---
  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    if (!newGroupName.trim()) {
      setCreateGroupError("Group name cannot be empty.");
      return;
    }

    setIsCreatingGroup(true);
    setCreateGroupError(null);

    try {
      // Use the apiClient to send POST request
      await apiClient.post<GroupResponseDto>("/groups", { name: newGroupName });

      // Clear the form and state
      setNewGroupName("");
      setIsCreatingGroup(false);

      // --- Trigger re-fetch of the groups list ---
      // This tells SWR to revalidate the data associated with the '/groups' key
      mutate("/groups");

      // Optionally show a success message (could use a state or toast library)
      // alert('Group created successfully!');
    } catch (error: any) {
      console.error("Failed to create group:", error);
      setCreateGroupError(
        error.message || "Failed to create group. Please try again."
      );
      setIsCreatingGroup(false);
    }
  };

  // --- Restore Group Handler ---
  const handleRestoreGroup = useCallback(
    async (groupId: string) => {
      setRestoringGroupId(groupId);
      setRestoreError(null);
      try {
        // Call the PATCH endpoint for restoring
        await apiClient.patch(`/groups/${groupId}/restore`, {});

        // Mutate BOTH lists: remove from deleted, add back to active
        mutate(activeGroupsApiUrl);
        mutate(deletedGroupsApiUrl);

        // Optional: Success feedback
        // alert('Group restored!');
      } catch (error: any) {
        console.error("Failed to restore group:", error);
        setRestoreError(`Failed to restore group: ${error.message}`);
      } finally {
        setRestoringGroupId(null);
      }
    },
    [mutate]
  );

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">My Groups</h1>

        {/* --- Create Group Form --- */}
        <form
          onSubmit={handleCreateGroup}
          className="mb-6 p-4 border rounded shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-2">Create New Group</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="flex-grow p-2 border rounded"
              disabled={isCreatingGroup}
              maxLength={100} // Match DTO validation
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isCreatingGroup || !newGroupName.trim()}
            >
              {isCreatingGroup ? "Creating..." : "Create"}
            </button>
          </div>
          {createGroupError && (
            <p className="text-red-500 mt-2">{createGroupError}</p>
          )}
        </form>

        {/* --- Display Groups List --- */}
        <h2 className="text-xl font-semibold mb-3">My Groups</h2>
        {isLoading && <p>Loading groups...</p>}

        {fetchGroupsError && (
          <p className="text-red-500">
            Error loading groups: {fetchGroupsError.message}
          </p>
        )}

        {!isLoading && !fetchGroupsError && groups && (
          <div className="mb-8">
            {groups.length === 0 ? (
              <p>You are not a member of any groups yet. Create one above!</p>
            ) : (
              <ul className="space-y-2">
                {groups.map((group) => (
                  <li
                    key={group.id}
                    className="border rounded shadow-sm hover:bg-gray-50"
                  >
                    <Link href={`/groups/${group.id}`} className="block p-3">
                      {" "}
                      <span className="font-semibold text-lg">
                        {group.name}
                      </span>
                      <p className="text-sm text-gray-500">
                        Created:{" "}
                        {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* --- DELETED Groups List & Restore Button --- */}
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-semibold mb-3 text-gray-600">
            Archived Groups
          </h2>
          {/* Display restore error if any */}
          {restoreError && (
            <p className="text-red-500 mb-2 text-sm">{restoreError}</p>
          )}

          {deletedLoading && <p>Loading archived groups...</p>}
          {fetchDeletedError && (
            <p className="text-red-500">
              Error loading archived groups: {fetchDeletedError.message}
            </p>
          )}
          {!deletedLoading && !fetchDeletedError && deletedGroups && (
            <div>
              {deletedGroups.length === 0 ? (
                <p className="text-gray-500">No archived groups found.</p>
              ) : (
                <ul className="space-y-2">
                  {deletedGroups.map((group) => (
                    <li
                      key={group.id}
                      className="p-3 border rounded bg-gray-100 opacity-70 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-lg text-gray-500 line-through">
                          {group.name}
                        </span>
                        <p className="text-sm text-gray-400">
                          Archived on:{" "}
                          {group.deletedAt
                            ? new Date(group.deletedAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreGroup(group.id)}
                        disabled={restoringGroupId === group.id}
                        className="p-1 px-3 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {restoringGroupId === group.id
                          ? "Restoring..."
                          : "Restore"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
