"use client";

import { SiteHeader } from "@/components/site-header";
import { ArchivedGroupCards } from "@components/dashboard-archived-group-cards";
import { GroupCards } from "@components/dashboard-group-cards";

import ProtectedLayout from "@components/ProtectedLayout";

export default function Home() {
  return (
    <ProtectedLayout>
      <SiteHeader pageName="Dashboard" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <h2 className="text-xl font-semibold px-6">My Groups</h2>
            <GroupCards />
            <ArchivedGroupCards />
            {/*  <h2 className="text-xl font-semibold px-6">My Recent Activity</h2> */}
            {/* //[]: add recent activity */}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
