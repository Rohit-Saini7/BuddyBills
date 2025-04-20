import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <head>
        {/* --- PWA Meta Tags --- */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4285F4" />
        {/* Match manifest theme_color */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Adjust path if needed */}
        {/* Add other meta tags if needed (e.g., viewport already handled by Next.js) */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
