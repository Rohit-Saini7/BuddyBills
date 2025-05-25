import { AppSidebar } from "@components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar";
import { Toaster } from "@components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Rajdhani } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal"],
  fallback: ["system-ui", "sans-serif"],
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "BuddyBills",
  description: "Share expenses, not stress.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* --- PWA Meta Tags --- */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4285F4" />
        {/* Match manifest theme_color */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${rajdhani.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider
              style={
                {
                  "--sidebar-width": "calc(var(--spacing) * 72)",
                  "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
              }
            >
              <AppSidebar variant="floating" />
              <SidebarInset>
                {children}
                <Toaster position="top-right" richColors />
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
