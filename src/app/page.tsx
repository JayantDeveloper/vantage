"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Vantage</span>
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-6 gap-8">
        <div className="space-y-4 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
            Campus Opportunity Autopilot
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Never miss a scholarship<br />
            <span className="text-zinc-400">again.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Vantage discovers UMD scholarships, scores them against your profile,
            and auto-fills applications — one click at a time.
          </p>
        </div>

        <div className="flex gap-4 mt-2">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-zinc-200 font-semibold px-8 h-11">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <SignInButton mode="modal">
              <Button className="bg-white text-black hover:bg-zinc-200 font-semibold px-8 h-11">
                Get Started
              </Button>
            </SignInButton>
          )}
          <Link href="/opportunities">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 h-11 px-8">
              Browse Opportunities
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-12 mt-8 text-center">
          {[
            { label: "Scholarships Indexed", value: "200+" },
            { label: "Avg. Match Time", value: "< 2s" },
            { label: "Forms Auto-Filled", value: "1-click" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-zinc-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
