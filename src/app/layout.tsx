import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vantage — Campus Opportunity Autopilot",
  description: "Automatically discover and apply to scholarships and grants.",
  icons: {
    icon: "/vantage-mark.svg",
    shortcut: "/vantage-mark.svg",
    apple: "/vantage-mark.svg",
  },
  openGraph: {
    title: "Vantage — Campus Opportunity Autopilot",
    description: "Automatically discover and apply to scholarships and grants.",
    images: [{ url: "/vantage-logo.svg", width: 480, height: 510 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${geistMono.variable} antialiased bg-black text-white min-h-screen`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
