import type { Metadata } from "next";
import { Suspense } from "react";
import { Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { orgSettings } from "@/lib/org-settings";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: orgSettings.orgName,
  description: "Member registration and management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>
        <Suspense fallback={<div className="h-[4.25rem] border-b border-slate-200 bg-white" />}>
          <AppHeader />
        </Suspense>
        <main>{children}</main>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
