"use client";

import { apiClient } from "@/lib/apiClient";
import {
  ExpenseResponseDto,
  GroupMemberResponseDto,
  SplitType,
  UpdateExpenseDto,
} from "@/types";
import React, { useMemo, useState } from "react";

interface EditExpenseModalProps {
  expense: ExpenseResponseDto;
  members: GroupMemberResponseDto[];
  loggedInUserId: string;
  onClose: () => void;
  onSave: () => void; // Callback after successful save
}

export default function EditExpenseModal({
  expense,
  members,
  loggedInUserId,
  onClose,
  onSave,
}: EditExpenseModalProps) {
  // --- Form State ---
  const [description, setDescription] = useState(expense.description);
  const [amountStr, setAmountStr] = useState(expense.amount.toFixed(2)); // Use string for input
  const [transactionDate, setTransactionDate] = useState(
    expense.transaction_date
  );
  const [splitType, setSplitType] = useState<SplitType>(
    /* expense.split_type || */ SplitType.EQUAL
  ); // Default or load from expense if backend returns it
  const [splitInputs, setExactSplits] = useState<{ [userId: string]: string }>(
    {}
  ); // Initialize empty or prefill if possible

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Pre-fill exact splits if editing an EXACT split expense ---
  // Note: This part requires the backend GET /expenses/:id or GET /groups/:groupId/expenses
  // to return the existing 'splits' data associated with the expense.
  // If it doesn't return splits, we cannot reliably pre-fill exact amounts,
  // and the user would have to re-enter them if they choose EXACT during edit.
  // Let's assume for now we *don't* have the splits readily available on the `expense` prop.
  // We will require re-entry if they switch to or edit with EXACT type.
  // useEffect(() => {
  //    if (expense.split_type === SplitType.EXACT && expense.splits) {
  //        const initialSplits = expense.splits.reduce((acc, split) => {
  //            acc[split.owed_by_user_id] = split.amount.toFixed(2);
  //            return acc;
  //        }, {} as { [userId: string]: string });
  //        setExactSplits(initialSplits);
  //    }
  // }, [expense]); // Re-run if the expense prop changes

  // --- Calculated values for EXACT split validation ---
  const currentExactSplitTotal = useMemo(() => {
    return Object.values(splitInputs).reduce((sum, amountStr) => {
      const amount = parseFloat(amountStr);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [splitInputs]);
  const totalExpenseAmountNumber = parseFloat(amountStr);
  const remainingAmount = useMemo(
    () =>
      !isNaN(totalExpenseAmountNumber)
        ? totalExpenseAmountNumber - currentExactSplitTotal
        : 0,
    [totalExpenseAmountNumber, currentExactSplitTotal]
  );

  // --- Handler for Exact Split Input Changes ---
  const handleSplitInputChange = (userId: string, value: string) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setExactSplits((prev) => ({ ...prev, [userId]: value }));
    }
  };

  // --- Helper calculations for validation display ---
  const percentageTotal = useMemo(() => {
    if (splitType !== SplitType.PERCENTAGE) return 0;
    return Object.values(splitInputs).reduce((sum, percentStr) => {
      const percent = parseFloat(percentStr);
      return sum + (isNaN(percent) ? 0 : percent);
    }, 0);
  }, [splitInputs, splitType]);

  const sharesTotal = useMemo(() => {
    if (splitType !== SplitType.SHARE) return 0;
    return Object.values(splitInputs).reduce((sum, shareStr) => {
      const share = parseFloat(shareStr);
      return sum + (isNaN(share) ? 0 : share);
    }, 0);
  }, [splitInputs, splitType]);

  // Add overall validation status for submit button
  const isValid = useMemo(() => {
    const amountNumber = parseFloat(amountStr);
    if (
      !description.trim() ||
      isNaN(amountNumber) ||
      amountNumber <= 0 ||
      !transactionDate
    )
      return false;
    if (splitType === SplitType.EXACT) return Math.abs(remainingAmount) < 0.015;
    if (splitType === SplitType.PERCENTAGE)
      return Math.abs(percentageTotal - 100) < 0.01; // Use stricter tolerance for %?
    if (splitType === SplitType.SHARE) return sharesTotal > 0;
    return true; // For EQUAL
  }, [
    description,
    amountStr,
    transactionDate,
    splitType,
    remainingAmount,
    percentageTotal,
    sharesTotal,
  ]);

  // --- Handler for Form Submission ---
  const handleUpdateExpense = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError(null);
    const amountNumber = parseFloat(amountStr);

    if (!isValid) {
      // Use the memoized validation check
      setError("Please check form inputs and split allocations.");
      return;
    }

    // --- Construct Payload (only include changed fields or all for PATCH) ---
    const payload: UpdateExpenseDto = {
      // Always include fields that might need validation together
      amount: amountNumber,
      split_type: splitType,
      splits: [],
    };
    if (description !== expense.description) payload.description = description;
    if (transactionDate !== expense.transaction_date)
      payload.transaction_date = transactionDate;

    const memberIds = members.map((m) => m.user.id);

    // --- Validation and Payload construction for EXACT ---
    if (splitType === SplitType.EQUAL) {
      // No 'splits' needed in payload, backend handles it
      delete payload.splits;
    } else if (splitType === SplitType.EXACT) {
      payload.splits = Object.entries(splitInputs)
        .map(([userId, amountStr]) => ({
          user_id: userId,
          amount: parseFloat(amountStr || "0"),
        }))
        .filter(
          (split) => split.amount > 0.005 && memberIds.includes(split.user_id)
        ); // Ensure user is still member

      if (payload.splits.length === 0) {
        setError(`Exact splits must involve at least one positive amount.`);
        return;
      }
    } else if (splitType === SplitType.PERCENTAGE) {
      payload.splits = Object.entries(splitInputs)
        .map(([userId, percentStr]) => ({
          user_id: userId,
          percentage: parseFloat(percentStr || "0"),
        }))
        .filter(
          (split) =>
            split.percentage &&
            split.percentage > 0.0001 &&
            memberIds.includes(split.user_id)
        );

      if (payload.splits.length === 0) {
        setError(
          `Percentage splits must involve at least one positive percentage.`
        );
        return;
      }
    } else if (splitType === SplitType.SHARE) {
      payload.splits = Object.entries(splitInputs)
        .map(([userId, shareStr]) => ({
          user_id: userId,
          shares: parseFloat(shareStr || "0"),
        }))
        .filter(
          (split) =>
            split.shares &&
            split.shares > 0.0001 &&
            memberIds.includes(split.user_id)
        );

      if (payload.splits.length === 0) {
        setError(`Share splits must involve at least one positive share.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      await apiClient.patch(`/expenses/${expense.id}`, payload);
      onSave(); // Call the onSave callback (triggers mutate & closes modal)
    } catch (error: any) {
      console.error("Failed to update expense:", error);
      setError(error.message || "Failed to update expense.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Simple Modal Structure (replace with your preferred modal library/styling)
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Expense</h2>
        <form onSubmit={handleUpdateExpense} className="space-y-4">
          {/* Description Input */}
          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <input
              type="text"
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={255}
              className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
              disabled={isLoading}
            />
          </div>
          {/* Amount & Date Inputs */}
          <div className="flex space-x-3">
            <div className="flex-1">
              <label
                htmlFor="edit-amount"
                className="block text-sm font-medium text-gray-700"
              >
                Total Amount (₹)
              </label>
              <input
                type="number"
                id="edit-amount"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                step="0.01"
                min="0.01"
                className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                disabled={isLoading}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="edit-date"
                className="block text-sm font-medium text-gray-700"
              >
                Date
              </label>
              <input
                type="date"
                id="edit-date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
                disabled={isLoading}
              />
            </div>
          </div>
          {/* Split Method Selector */}
          <div>
            <label
              htmlFor="edit-splitType"
              className="block text-sm font-medium text-gray-700"
            >
              Split Method
            </label>
            <select
              id="edit-splitType"
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as SplitType)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"
              disabled={isLoading}
            >
              <option value={SplitType.EQUAL}>Split Equally</option>
              <option value={SplitType.EXACT}>Split by Exact Amounts</option>
              <option value={SplitType.PERCENTAGE}>Split by Percentage</option>
              <option value={SplitType.SHARE}> Split by Shares </option>
            </select>
          </div>
          {/* Conditional Exact Splits */}
          {splitType === SplitType.EXACT && (
            <div className="space-y-2 pt-3 border-t mt-4">
              <h3 className="text-md font-medium text-gray-800">
                Enter Exact Amounts Owed:
              </h3>
              {/* Member Inputs for Exact Split */}
              {members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between space-x-2"
                >
                  <label
                    htmlFor={`edit-split-${member.user.id}`}
                    className="flex-grow text-sm text-gray-600 truncate"
                    title={member.user.name || member.user.email}
                  >
                    {member.user.name || member.user.email}
                    {member.user.id === loggedInUserId ? " (You)" : ""}
                  </label>
                  <input
                    type="number"
                    id={`edit-split-${member.user.id}`}
                    value={splitInputs[member.user.id] || ""}
                    onChange={(e) =>
                      handleSplitInputChange(member.user.id, e.target.value)
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="p-1 border rounded w-24 text-right"
                    disabled={isLoading}
                  />
                </div>
              ))}
              {/* Display sum validation helper */}
              <div
                className={`mt-2 text-sm font-medium ${Math.abs(remainingAmount) < 0.015 ? "text-green-600" : "text-red-600"}`}
              >
                Total Assigned: ₹{currentExactSplitTotal.toFixed(2)} / ₹
                {(totalExpenseAmountNumber || 0).toFixed(2)}
                (Remaining: ₹{remainingAmount.toFixed(2)})
              </div>
            </div>
          )}

          {/* --- Conditional Inputs for PERCENTAGE Split --- */}
          {splitType === SplitType.PERCENTAGE && (
            <div className="space-y-2 pt-3 border-t mt-4">
              <h3 className="text-md font-medium text-gray-800">
                Enter Percentages:
              </h3>
              {members &&
                members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between space-x-2"
                  >
                    <label
                      htmlFor={`split-${member.user.id}`}
                      className="flex-grow text-sm text-gray-600 truncate"
                      title={member.user.name || member.user.email}
                    >
                      {member.user.name || member.user.email}{" "}
                      {member.user.id === loggedInUserId ? " (You)" : ""}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        id={`split-${member.user.id}`}
                        value={splitInputs[member.user.id] || ""}
                        onChange={(e) =>
                          handleSplitInputChange(member.user.id, e.target.value)
                        }
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                        className="p-1 border rounded w-20 text-right"
                        disabled={isLoading}
                      />
                      <span className="ml-1 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                ))}
              {/* Display percentage sum validation helper */}
              <div
                className={`mt-2 text-sm font-medium ${Math.abs(percentageTotal - 100) < 0.01 ? "text-green-600" : "text-red-600"}`}
              >
                Total Assigned: {percentageTotal.toFixed(2)}% / 100%
              </div>
            </div>
          )}

          {/* --- Conditional Inputs for SHARE Split --- */}
          {splitType === SplitType.SHARE && (
            <div className="space-y-2 pt-3 border-t mt-4">
              <h3 className="text-md font-medium text-gray-800">
                Enter Shares:
              </h3>

              {members &&
                members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between space-x-2"
                  >
                    <label
                      htmlFor={`split-${member.user.id}`}
                      className="flex-grow text-sm text-gray-600 truncate"
                      title={member.user.name || member.user.email}
                    >
                      {member.user.name || member.user.email}{" "}
                      {member.user.id === loggedInUserId ? " (You)" : ""}
                    </label>
                    <input
                      type="number"
                      id={`split-${member.user.id}`}
                      value={splitInputs[member.user.id] || ""}
                      onChange={(e) =>
                        handleSplitInputChange(member.user.id, e.target.value)
                      }
                      placeholder="0"
                      step="0.1"
                      min="0" // Allow fractional shares? Or just integers? Adjust step/validation if needed
                      className="p-1 border rounded w-20 text-right"
                      disabled={isLoading}
                    />
                  </div>
                ))}
              {/* Display total shares */}
              <div className="mt-2 text-sm font-medium text-gray-700">
                Total Shares Assigned: {sharesTotal.toFixed(2)}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={onClose}
              disabled={isLoading}
              className="p-2 px-4 border rounded text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                (splitType === SplitType.EXACT &&
                  Math.abs(remainingAmount) > 0.015)
              } // Disable if loading or exact amounts don't match
              className="p-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
