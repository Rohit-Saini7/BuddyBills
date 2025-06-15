import { Button } from "@/components/ui/button";
import { FeatureCards } from "@components/FeatureCards";
import { ModeToggle } from "@components/theme-toggle";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-25 md:px-16 bg-white dark:bg-black text-black dark:text-white">
      <div className="absolute top-7 right-7">
        <ModeToggle />
      </div>
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Split the bill, not the fun.
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-xl mx-auto">
          Manage, split, and settle group expenses — anytime, anywhere.
        </p>
        <Button
          asChild
          className="bg-[#8e51ff] text-white hover:bg-purple-600 text-lg px-6 py-3"
        >
          <Link href="/login">Get Started</Link>
        </Button>
        <div className="flex-center mt-2 text-sm text-gray-500 dark:text-gray-400">
          100% free and&nbsp;
          <Link
            href="https://github.com/Rohit-Saini7/BuddyBills"
            className="flex gap-1 items-center"
            target="_blank"
          >
            Open Source <ExternalLinkIcon size={12} />
          </Link>
        </div>
      </section>

      <FeatureCards />
    </main>
  );
}
