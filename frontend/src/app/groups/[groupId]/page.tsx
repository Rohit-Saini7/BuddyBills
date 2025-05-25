"use client";

import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import {
  BalanceResponseDto,
  CreatePaymentDto,
  ExpenseResponseDto,
  GroupMemberResponseDto,
  GroupResponseDto,
  PaymentResponseDto,
  UpdateGroupDto,
} from "@/types";
import EditExpenseModal from "@components/EditExpenseModal";
import ProtectedLayout from "@components/ProtectedLayout";
import { SiteHeader } from "@components/site-header";
import { useParams } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

//* --- Fetchers ---
const fetchGroup = (url: string) => apiClient.get<GroupResponseDto>(url);
const fetchMembers = (url: string) =>
  apiClient.get<GroupMemberResponseDto[]>(url);
const fetchExpenses = (url: string) => apiClient.get<ExpenseResponseDto[]>(url);
const fetchBalances = (url: string) => apiClient.get<BalanceResponseDto[]>(url);

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user: loggedInUser, isLoading: isAuthLoading } = useAuth();
  const { mutate } = useSWRConfig();

  //* --- State for Record Payment Form ---
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paidToUserId, setPaidToUserId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [recordPaymentError, setRecordPaymentError] = useState<string | null>(
    null
  );

  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(
    null
  );

  const [editingExpense, setEditingExpense] =
    useState<ExpenseResponseDto | null>(null);

  //* --- NEW State for Editing Group Name ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  //* --- SWR Hooks ---
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
  } = useSWR(expensesApiUrl, fetchExpenses);

  const balancesApiUrl = groupId ? `/groups/${groupId}/balances` : null;
  const {
    data: balances,
    error: balancesError,
    isLoading: balancesLoading,
  } = useSWR(balancesApiUrl, fetchBalances);

  const isSettledUp = useMemo(() => {
    if (!balances || balances.length === 0) {
      return true;
    }
    const tolerance = 0.01;
    return balances.every(
      (balance) => Math.abs(balance.netBalance) < tolerance
    );
  }, [balances]);

  //* --- Handlers ---

  const handleRecordPayment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const amountNumber = parseFloat(paymentAmount);

    if (!paidToUserId) {
      setRecordPaymentError("Please select who you paid.");
      return;
    }
    if (!paymentAmount || isNaN(amountNumber) || amountNumber <= 0) {
      setRecordPaymentError("Please enter a valid positive amount.");
      return;
    }
    if (!groupId || !loggedInUser) return;

    setIsRecordingPayment(true);
    setRecordPaymentError(null);

    const paymentData: CreatePaymentDto = {
      amount: amountNumber,
      paid_to_user_id: paidToUserId,
      payment_date: paymentDate,
    };

    try {
      await apiClient.post<PaymentResponseDto>(
        `/groups/${groupId}/payments`,
        paymentData
      );

      setPaymentAmount("");
      setPaidToUserId("");
      setPaymentDate(new Date().toISOString().split("T")[0]);

      //* --- IMPORTANT: Revalidate balances ---
      mutate(balancesApiUrl);
    } catch (error: any) {
      console.error("Failed to record payment:", error);
      setRecordPaymentError(error.message || "Failed to record payment.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this expense? This action cannot be undone."
        )
      ) {
        return;
      }

      setDeletingExpenseId(expenseId);
      setDeleteExpenseError(null);

      try {
        await apiClient.delete(`/expenses/${expenseId}`);

        mutate(expensesApiUrl);
        mutate(balancesApiUrl);
      } catch (error: any) {
        console.error("Failed to delete expense:", error);
        setDeleteExpenseError(`Failed to delete expense: ${error.message}`);
      } finally {
        setDeletingExpenseId(null);
      }
    },
    [groupId, mutate, expensesApiUrl, balancesApiUrl]
  );

  const handleEditNameClick = () => {
    if (group) {
      setEditedGroupName(group.name);
      setIsEditingName(true);
      setEditNameError(null);
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditNameError(null);
  };

  const handleSaveGroupName = async () => {
    if (!editedGroupName.trim()) {
      setEditNameError("Group name cannot be empty.");
      return;
    }
    if (!group || editedGroupName.trim() === group.name) {
      setIsEditingName(false);
      setEditNameError(null);
      return;
    }

    setIsSavingName(true);
    setEditNameError(null);

    try {
      const updateData: UpdateGroupDto = { name: editedGroupName.trim() };
      await apiClient.patch<GroupResponseDto>(
        `/groups/${group.id}`,
        updateData
      );

      mutate(groupApiUrl);

      setIsEditingName(false);
    } catch (error: any) {
      console.error("Failed to update group name:", error);
      setEditNameError(error.message || "Could not update group name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const isLoading = groupLoading || isAuthLoading;

  const otherMembers =
    members?.filter((m) => m.user.id !== loggedInUser?.id) || [];

  return (
    <ProtectedLayout>
      <SiteHeader pageName={group?.name ?? ""} groupId={groupId} />
      <div className="container mx-auto p-4">
        {/* Group Details Loading/Error/Display */}
        {isLoading && <p>Loading group details...</p>}
        {groupError && (
          <div className="text-red-500 mb-4"> /* ... Error Display ... */ </div>
        )}

        {!isLoading && !groupError && group && (
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-3 mb-4">
              <h1 className="text-2xl font-bold"> {group.name} </h1>
            </div>

            {/* --- Balances Section --- */}
            <div className="p-4 border rounded bg-accent shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Group Balances</h2>
              {balancesLoading && <p>Calculating balances...</p>}
              {balancesError && (
                <p className="text-red-500">
                  Error loading balances: {balancesError.message}
                </p>
              )}
              {!balancesLoading && !balancesError && balances && (
                <ul className="space-y-2">
                  {balances.length === 0 ? (
                    <p>No balances to show yet.</p>
                  ) : (
                    balances.map((balance) => {
                      const isCurrentUser =
                        balance.user.id === loggedInUser?.id;
                      const balanceAmount = Math.abs(balance.netBalance);
                      const isOwed = balance.netBalance > 0.005;
                      const owesMoney = balance.netBalance < -0.005;
                      const isSettled = !isOwed && !owesMoney;

                      let balanceText = "";
                      let textColor = "text-gray-600";

                      if (isSettled) {
                        balanceText = isCurrentUser
                          ? "You are settled up"
                          : `${balance.user.name || balance.user.email} is settled up`;
                      } else if (isOwed) {
                        balanceText = isCurrentUser
                          ? `You are owed ₹${balanceAmount.toFixed(2)}`
                          : `${balance.user.name || balance.user.email} is owed ₹${balanceAmount.toFixed(2)}`;
                        textColor = "text-green-600";
                      } else if (owesMoney) {
                        balanceText = isCurrentUser
                          ? `You owe ₹${balanceAmount.toFixed(2)}`
                          : `${balance.user.name || balance.user.email} owes ₹${balanceAmount.toFixed(2)}`;
                        textColor = "text-red-600";
                      }

                      return (
                        <li
                          key={balance.user.id}
                          className="flex items-center justify-between p-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                balance.user.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(balance.user.name || balance.user.email)}&background=random`
                              }
                              alt={balance.user.name || balance.user.email}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="font-medium">
                              {isCurrentUser
                                ? "You"
                                : balance.user.name || balance.user.email}
                            </span>
                          </div>
                          <span className={`font-semibold ${textColor}`}>
                            {balanceText.replace(
                              `${balance.user.name || balance.user.email} `,
                              ""
                            )}
                            {/* Show only status text */}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
              {/* TODO: Add "Settle Up" button later */}
            </div>
            {/* //[]: --- Record Payment Section --- */}
            {/* <div className="p-4 border rounded bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Record a Payment</h2>
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <p className="text-sm text-gray-600 mb-2">
                  Record a payment *you* made to someone else in this group.
                </p>
                <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <label
                      htmlFor="paidTo"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Who did you pay?
                    </label>
                    <select
                      id="paidTo"
                      value={paidToUserId}
                      onChange={(e) => setPaidToUserId(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"
                      disabled={isRecordingPayment || otherMembers.length === 0}
                      required
                    >
                      <option value="" disabled>
                        Select member...
                      </option>
                      {otherMembers.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.name || member.user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 sm:flex-none sm:w-32">
                    <label
                      htmlFor="paymentAmount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      id="paymentAmount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      step="0.01"
                      min="0.01"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                      disabled={isRecordingPayment}
                    />
                  </div>
                  <div className="flex-1 sm:flex-none sm:w-40">
                    <label
                      htmlFor="paymentDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="paymentDate"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                      disabled={isRecordingPayment}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                  disabled={
                    isRecordingPayment || !paidToUserId || !paymentAmount
                  }
                >
                  {isRecordingPayment ? "Recording..." : "Record Payment"}
                </button>
                {recordPaymentError && (
                  <p className="text-red-500 mt-2 text-sm">
                    {recordPaymentError}
                  </p>
                )}
              </form>
            </div> */}

            {/* --- Expenses List Section --- */}
            <div className="p-4 border rounded bg-accent shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Expenses</h2>
              {/* Display general delete error if any */}
              {deleteExpenseError && (
                <p className="text-red-500 mb-2 text-sm">
                  {deleteExpenseError}
                </p>
              )}

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
                        className={`p-3 border-b flex justify-between items-center group ${
                          expense.deletedAt ? "opacity-50" : ""
                        }`}
                      >
                        {/* Added group class for hover effect */}
                        {/* Expense Details */}
                        <div
                          className={`${
                            expense.deletedAt
                              ? "line-through text-gray-400"
                              : ""
                          }`}
                        >
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            Paid by&nbsp;
                            {expense.paidBy?.id === loggedInUser?.id
                              ? "You"
                              : expense.paidBy?.name ||
                                expense.paidBy?.email ||
                                "Unknown"}
                            &nbsp;on&nbsp;
                            {new Date(
                              expense.transaction_date + "T00:00:00"
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Amount and Delete Button */}
                        <div className="flex items-center space-x-3">
                          <span
                            className={`font-semibold text-lg ${
                              expense.deletedAt
                                ? "line-through text-gray-400"
                                : ""
                            }`}
                          >
                            ₹{expense.amount.toFixed(2)}
                          </span>

                          {/* --- Edit Button --- */}
                          {!expense.deletedAt &&
                            expense.paidBy?.id === loggedInUser?.id && (
                              <button
                                onClick={() => setEditingExpense(expense)}
                                className="p-1 text-blue-500 rounded hover:bg-blue-100"
                                title="Edit Expense"
                                aria-label={`Edit expense: ${expense.description}`}
                              >
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            )}
                          {/* Delete Button */}
                          {!expense.deletedAt &&
                            expense.paidBy?.id === loggedInUser?.id && (
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={deletingExpenseId === expense.id}
                                className={`p-1 text-red-500 rounded hover:bg-red-100 disabled:opacity-50 ${deletingExpenseId === expense.id ? "animate-pulse" : ""}`}
                                title="Delete Expense"
                                aria-label={`Delete expense: ${expense.description}`}
                              >
                                {deletingExpenseId === expense.id ? (
                                  <span className="text-xs">Deleting...</span>
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                )}
                              </button>
                            )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* --- Conditionally Render Edit Modal --- */}
        {editingExpense && (
          <EditExpenseModal
            expense={editingExpense}
            members={members || []}
            loggedInUserId={loggedInUser?.id || ""}
            onClose={() => setEditingExpense(null)}
            onSave={() => {
              mutate(expensesApiUrl);
              mutate(balancesApiUrl);
              setEditingExpense(null);
            }}
          />
        )}
      </div>
    </ProtectedLayout>
  );
}
