"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Crunching numbers...",
  "Balancing bills...",
  "Splitting fairly...",
  "Syncing groups...",
  "Tracking shares...",
  "Calculating who owes who...",
  "Sorting transactions...",
  "Fetching your ledger...",
  "Connecting to the vault...",
  "Chasing that one friend who never pays...",
  "Making money less awkward...",
  "Waiting for the friend who paid in cash...",
  "Clearing the dust off your expenses...",
  "Getting things ready for your next trip...",
  "Calling out who's the real freeloader...",
  "Trying to remember who ordered the extra fries...",
  "Converting vibes into receipts...",
  "Smoothing out the awkward silences...",
  "Asking the group chat again... nicely.",
  "Loading the unofficial accountant...",
  "Checking who went MIA after the trip...",
  "Running calculations no one else wanted to do...",
  "Notifying the person who always forgets... again.",
  "Balancing karma and spreadsheets...",
  "Sharpening the virtual pencils...",
  "Grabbing the receipts from the cloud (not that one)...",
  "Waiting for someone to stop ghosting your payment...",
  "Dusting off your financial friendships...",
  "Replaying the group argument in 4K...",
  "Rounding ₹9.1 to ₹10 like a true legend...",
  "Budgeting the banter...",
  "Locating your inner peace (and your debts)...",
];

const randomIndex = () => Math.ceil(Math.random() * MESSAGES.length);

export default function LoaderMessages() {
  const [index, setIndex] = useState(randomIndex());

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = randomIndex();
        return next === prev ? (next + 1) % MESSAGES.length : next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center text-xl font-medium flex-center h-full text-[#956afa]">
      <AnimatePresence mode="wait">
        <motion.div
          key={MESSAGES[index]}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          {MESSAGES[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
