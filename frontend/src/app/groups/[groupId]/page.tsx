"use client";

import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { apiClient } from "@/lib/apiClient";
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  GroupMemberResponseDto,
  GroupResponseDto,
} from "@/types";
import ProtectedLayout from "@components/ProtectedLayout";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

// --- Fetchers ---
const fetchGroup = (url: string) => apiClient.get<GroupResponseDto>(url);
const fetchMembers = (url: string) =>
  apiClient.get<GroupMemberResponseDto[]>(url);
const fetchExpenses = (url: string) => apiClient.get<ExpenseResponseDto[]>(url); // Fetcher for expenses

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user: loggedInUser } = useAuth(); // Get logged-in user info (needed for payer display)
  const { mutate } = useSWRConfig();

  // --- State for Add Expense Form ---
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  ); // Default to today YYYY-MM-DD
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);

  // --- State for Add Member Form (from previous step) ---
  const [memberEmail, setMemberEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // --- SWR Hooks ---
  const groupApiUrl = groupId ? `/groups/${groupId}` : null;
  const {
    data: group,
    error: groupError,
    isLoading: groupLoading,
  } = useSWR(groupApiUrl, fetchGroup);

  const membersApiUrl = groupId ? `/groups/${groupId}/members` : null;
  const {
    data: members,
    error: membersError,
    isLoading: membersLoading,
  } = useSWR(membersApiUrl, fetchMembers);

  const expensesApiUrl = groupId ? `/groups/${groupId}/expenses` : null;
  const {
    data: expenses,
    error: expensesError,
    isLoading: expensesLoading,
  } = useSWR(expensesApiUrl, fetchExpenses); // SWR for expenses

  // --- Handlers ---

  // Add Member Handler (from previous step)
  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    // ... (keep existing handleAddMember logic) ...
    event.preventDefault();
    if (!memberEmail.trim()) {
      setAddMemberError("Email cannot be empty.");
      return;
    }
    if (!groupId) return; // Should not happen if page loads
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      await apiClient.post<GroupMemberResponseDto>(
        `/groups/${groupId}/members`,
        { email: memberEmail }
      );
      setMemberEmail("");
      setIsAddingMember(false);

      mutate(membersApiUrl); // Revalidate members
    } catch (error: any) {
      setAddMemberError(error.message || "Failed to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Add Expense Handler
  const handleAddExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountNumber = parseFloat(expenseAmount);

    if (
      !expenseDescription.trim() ||
      !expenseAmount ||
      isNaN(amountNumber) ||
      amountNumber <= 0 ||
      !expenseDate
    ) {
      setAddExpenseError(
        "Please fill in all fields correctly (Amount must be positive)."
      );
      return;
    }
    if (!groupId) return;

    setIsAddingExpense(true);
    setAddExpenseError(null);

    const expenseData: CreateExpenseDto = {
      description: expenseDescription,
      amount: amountNumber,
      transaction_date: expenseDate,
    };

    try {
      await apiClient.post<ExpenseResponseDto>(
        `/groups/${groupId}/expenses`,
        expenseData
      );
      // Clear form on success
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      // Revalidate expenses list
      mutate(expensesApiUrl);
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      setAddExpenseError(error.message || "Failed to add expense.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-4">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Group Details Loading/Error/Display */}
        {groupLoading && <p>Loading group details...</p>}
        {groupError && (
          <div className="text-red-500 mb-4"> /* ... Error Display ... */ </div>
        )}

        {!groupLoading && !groupError && group && (
          <div>
            <h1 className="text-2xl font-bold mb-4">{group.name}</h1>
            {/* <p className="text-sm text-gray-600 mb-4">Created on: {new Date(group.createdAt).toLocaleString()}</p> */}{" "}
            {/* Can remove if not needed */}
            {/* --- Add Expense Section --- */}
            <div className="mb-6 p-4 border rounded bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Add New Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="What was this for?"
                    required
                    maxLength={255}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                    disabled={isAddingExpense}
                  />
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      id="amount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      step="0.01"
                      min="0.01"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                      disabled={isAddingExpense}
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="date"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                      className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                      disabled={isAddingExpense}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={isAddingExpense}
                >
                  {isAddingExpense ? "Adding..." : "Add Expense"}
                </button>
                {addExpenseError && (
                  <p className="text-red-500 mt-2 text-sm">{addExpenseError}</p>
                )}
              </form>
            </div>
            {/* --- Expenses List Section --- */}
            <div className="mb-6 p-4 border rounded bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Expenses</h2>
              {expensesLoading && <p>Loading expenses...</p>}
              {expensesError && (
                <p className="text-red-500">
                  Error loading expenses: {expensesError.message}
                </p>
              )}
              {!expensesLoading && !expensesError && expenses && (
                <ul className="space-y-3">
                  {expenses.length === 0 ? (
                    <p>No expenses added to this group yet.</p>
                  ) : (
                    expenses.map((expense) => (
                      <li
                        key={expense.id}
                        className="p-3 border-b flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            Paid by{" "}
                            {expense.paidBy?.id === loggedInUser?.id
                              ? "You"
                              : expense.paidBy?.name ||
                                expense.paidBy?.email ||
                                "Unknown"}{" "}
                            on{" "}
                            {new Date(
                              expense.transaction_date + "T00:00:00"
                            ).toLocaleDateString()}{" "}
                            {/* Add time part for correct local date */}
                          </p>
                        </div>
                        <span className="font-semibold text-lg">
                          ₹{expense.amount.toFixed(2)}{" "}
                          {/* Format amount - consider locale later */}
                        </span>
                        {/* TODO: Add view details/edit/delete buttons later */}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {/* --- Members Section (from previous step) --- */}
            <div className="mt-6 p-4 border rounded bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Members</h2>
              {/* ... Member list rendering ... */}
              {/* ... Add Member form ... */}
              {!membersLoading &&
                !membersError &&
                members /* Ensure this section is still here */ && (
                  <ul className="space-y-2 mb-4">
                    {/* ... mapping members ... */}
                    {members.map((member) => (
                      <li key={member.id}>...</li>
                    ))}
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
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
