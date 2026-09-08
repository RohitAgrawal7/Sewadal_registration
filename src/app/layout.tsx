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
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "860x860", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>
        <Suspense
          fallback={
            <div className="h-[4.25rem] border-b border-sky-200/70 bg-gradient-to-r from-sky-100 to-amber-100" />
          }
        >
          <AppHeader />
        </Suspense>
        <main>{children}</main>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
