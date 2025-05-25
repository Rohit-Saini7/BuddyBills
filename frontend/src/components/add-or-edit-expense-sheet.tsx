import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  GroupMemberResponseDto,
  SplitType,
} from "@/types";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import WrapperSheet from "@components/wrapper-sheet";
import { FilePenLineIcon } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const fetchMembers = (url: string) =>
  apiClient.get<GroupMemberResponseDto[]>(url);

export function AddOrEditExpenseSheet({
  isEdit,
  groupId,
  expense,
}: {
  isEdit?: boolean;
  groupId: string;
  expense?: ExpenseResponseDto;
}) {
  const { mutate } = useSWRConfig();

  const { user } = useAuth();

  const [isHandlingExpense, setIsHandlingExpense] = useState(false);
  const [handlingExpenseError, setHandlingExpenseError] = useState<
    string | null
  >(null);

  //* --- State for Add Expense Form ---
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [date, setDate] = useState<Date>();

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);

  //* --- NEW State for Split Logic ---
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUAL);

  const [splitInputs, setSplitInputs] = useState<{ [userId: string]: string }>(
    {}
  );

  const membersApiUrl = groupId ? `/groups/${groupId}/members` : null;
  const {
    data: members,
    error: membersError,
    isLoading: membersLoading,
  } = useSWR(membersApiUrl, fetchMembers);

  const expensesApiUrl = groupId ? `/groups/${groupId}/expenses` : null;
  const balancesApiUrl = groupId ? `/groups/${groupId}/balances` : null;

  //* --- Calculated value for exact split validation ---
  const currentExactSplitTotal = Object.values(splitInputs).reduce(
    (sum, amountStr) => {
      const amount = parseFloat(amountStr);
      return sum + (isNaN(amount) ? 0 : amount);
    },
    0
  );

  const totalExpenseAmountNumber = parseFloat(expenseAmount);
  const remainingAmount = !isNaN(totalExpenseAmountNumber)
    ? totalExpenseAmountNumber - currentExactSplitTotal
    : 0;

  //* --- Helper calculations for validation display ---
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

  const isValid = useMemo(() => {
    const amountNumber = parseFloat(expenseAmount);
    if (
      !expenseDescription.trim() ||
      isNaN(amountNumber) ||
      amountNumber <= 0 ||
      !expenseDate
    )
      return false;
    if (splitType === SplitType.EXACT) return Math.abs(remainingAmount) < 0.015;
    if (splitType === SplitType.PERCENTAGE)
      return Math.abs(percentageTotal - 100) < 0.01;
    if (splitType === SplitType.SHARE) return sharesTotal > 0;
    return true;
  }, [
    expenseDescription,
    expenseAmount,
    expenseDate,
    splitType,
    remainingAmount,
    percentageTotal,
    sharesTotal,
  ]);

  const handleSplitInputChange = (userId: string, value: string) => {
    if (value === "" || /^\d*\.?\d{0,4}$/.test(value)) {
      setSplitInputs((prev) => ({
        ...prev,
        [userId]: value,
      }));
    }
  };

  const handleAddExpense = async () => {
    const amountNumber = parseFloat(expenseAmount);
    setAddExpenseError(null);

    if (!isValid) {
      setAddExpenseError("Please check form inputs and split allocations.");
      return;
    }
    if (!groupId || !members) return;

    let expensePayload: Partial<CreateExpenseDto> = {
      description: expenseDescription,
      amount: amountNumber,
      transaction_date: expenseDate,
      split_type: splitType,
      splits: [],
    };

    const memberIds = members.map((m) => m.user.id);

    //* --- Construct splits array based on type ---
    if (splitType === SplitType.EQUAL) {
      delete expensePayload.splits;
    } else if (splitType === SplitType.EXACT) {
      expensePayload.splits = Object.entries(splitInputs)
        .map(([userId, amountStr]) => ({
          user_id: userId,
          amount: parseFloat(amountStr || "0"),
        }))
        .filter(
          (split) => split.amount > 0.005 && memberIds.includes(split.user_id)
        );

      if (expensePayload.splits.length === 0) {
        setAddExpenseError(
          `Exact splits must involve at least one positive amount.`
        );
        return;
      }
    } else if (splitType === SplitType.PERCENTAGE) {
      expensePayload.splits = Object.entries(splitInputs)
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

      if (expensePayload.splits.length === 0) {
        setAddExpenseError(
          `Percentage splits must involve at least one positive percentage.`
        );
        return;
      }
    } else if (splitType === SplitType.SHARE) {
      expensePayload.splits = Object.entries(splitInputs)
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

      if (expensePayload.splits.length === 0) {
        setAddExpenseError(
          `Share splits must involve at least one positive share.`
        );
        return;
      }
    }

    setIsAddingExpense(true);

    try {
      await apiClient.post<ExpenseResponseDto>(
        `/groups/${groupId}/expenses`,
        expensePayload
      );

      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setSplitType(SplitType.EQUAL);
      setSplitInputs({});
      setAddExpenseError(null);

      mutate(expensesApiUrl);
      mutate(balancesApiUrl);
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      setAddExpenseError(error.message || "Failed to add expense.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  return (
    <WrapperSheet
      trigger={
        <Button variant={isEdit ? "ghost" : "default"}>
          {isEdit ? <FilePenLineIcon /> : "Add New Expense"}
        </Button>
      }
      title={isEdit ? "Edit Expense" : "Add New Expense"}
      description={isEdit ? "Edit Expense" : "Add New Expense"}
      submitLabel={isAddingExpense ? "Saving..." : "Hold to Save"} //[]: isHandlingExpense
      submitFunction={handleAddExpense}
      submitError={addExpenseError ?? ""} //[]: handlingExpenseError
      submitLoading={isAddingExpense} //[]: isHandlingExpense
      submitDisable={isAddingExpense || !isValid}
      submitDelay={2000}
    >
      <div className="grid gap-4 px-4">
        <div className="grid grid-cols-5 items-center gap-4">
          <Label htmlFor="description" className="text-right col-span-2">
            Description
          </Label>
          <Input
            id="description"
            placeholder="What is it for?"
            className="col-span-3"
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            disabled={isAddingExpense}
            maxLength={255}
          />
          <Label htmlFor="amount" className="col-span-2">
            Total Amount(₹)
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            className="col-span-3 text-right"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            disabled={isAddingExpense}
            step="0.01"
            min="0.01"
          />
          <Label htmlFor="date" className="text-right col-span-2">
            Date
          </Label>
          <Input
            id="date"
            type="date"
            className="col-span-3 text-right"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            disabled={isAddingExpense}
          />
          {/* <DatePicker date={date} setDate={setDate} /> */}
          {/* //[]: change this to use Date picker */}

          <Label className="text-right col-span-2">Split Method</Label>
          <Select
            value={splitType}
            onValueChange={(e) => setSplitType(e as SplitType)}
            disabled={isAddingExpense}
          >
            <SelectTrigger className="col-span-3 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={SplitType.EQUAL}>
                  Split Equally(among all members)
                </SelectItem>
                <SelectItem value={SplitType.EXACT}>
                  Split by Exact Amounts
                </SelectItem>
                <SelectItem value={SplitType.PERCENTAGE}>
                  Split by Percentage
                </SelectItem>
                <SelectItem value={SplitType.SHARE}>Split by Shares</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* --- Conditional Inputs for EXACT Split --- */}
        {splitType === SplitType.EXACT && (
          <div className="space-y-2 pt-2 border-t mt-3">
            <h3 className="text-md font-medium text-gray-800">
              Enter Exact Amounts Owed:
            </h3>
            {membersLoading && <p>Loading members...</p>}
            {membersError && (
              <p className="text-red-500">Error loading members for split.</p>
            )}
            {members &&
              members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between space-x-2"
                >
                  <label
                    htmlFor={`split-${member.user.id}`}
                    className="flex-grow text-sm text-gray-600"
                  >
                    {member.user.name || member.user.email}
                    {member.user.id === user?.id ? " (You)" : ""}
                  </label>
                  <input
                    type="number"
                    id={`split-${member.user.id}`}
                    value={splitInputs[member.user.id] || ""}
                    onChange={(e) =>
                      handleSplitInputChange(member.user.id, e.target.value)
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="p-1 border rounded w-24 text-right"
                    disabled={isAddingExpense}
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
            {membersLoading && <p>Loading members...</p>}
            {membersError && (
              <p className="text-red-500">Error loading members.</p>
            )}
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
                    {member.user.id === user?.id ? " (You)" : ""}
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
                      disabled={isAddingExpense}
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
            <h3 className="text-md font-medium text-gray-800">Enter Shares:</h3>
            {membersLoading && <p>Loading members...</p>}
            {membersError && (
              <p className="text-red-500">Error loading members.</p>
            )}
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
                    {member.user.id === user?.id ? " (You)" : ""}
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
                    min="0"
                    className="p-1 border rounded w-20 text-right"
                    disabled={isAddingExpense}
                  />
                </div>
              ))}
            {/* Display total shares */}
            <div className="mt-2 text-sm font-medium text-gray-700">
              Total Shares Assigned: {sharesTotal.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </WrapperSheet>
  );
}
