"use client";

import { SidebarMenu, SidebarMenuItem } from "@components/ui/sidebar";
import {
  TrendingDownIcon,
  TrendingUpDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

function BackendStatus() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (!apiBaseUrl) {
      setApiStatus("API URL not configured");
      return;
    }
    fetch(`${apiBaseUrl}/health`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setApiStatus(`OK (${data.time})`);
      })
      .catch((error) => {
        console.error("Error fetching API status:", error);
        setApiStatus("Error connecting");
      });
  }, [apiBaseUrl]);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem className="flex gap-2">
          {apiStatus.includes("Checking...") ? (
            <TrendingUpDownIcon />
          ) : apiStatus.includes("OK") ? (
            <TrendingUpIcon />
          ) : (
            <TrendingDownIcon />
          )}
          {apiStatus}
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}

export default BackendStatus;
