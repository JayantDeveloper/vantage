"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { NavLogo } from "@/components/logo";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-[#080c14] text-white overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#2dcfbe]/8 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-[#c4195a]/6 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-[#1a2948]/60 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-5 border-b border-white/8">
        <NavLogo />
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" className="border-white/15 text-white hover:bg-white/8 hover:border-white/30">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline" className="border-white/15 text-white hover:bg-white/8 hover:border-white/30">
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center text-center px-6 gap-10">
        <div className="space-y-5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2dcfbe]/30 bg-[#2dcfbe]/8 text-[#2dcfbe] text-xs font-mono tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2dcfbe] animate-pulse" />
            Campus Opportunity Autopilot
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Never miss a{" "}
            <span className="bg-gradient-to-r from-[#2dcfbe] to-[#1a9e91] bg-clip-text text-transparent">
              scholarship
            </span>
            <br />
            again.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Vantage discovers UMD scholarships, scores them against your profile,
            and auto-fills applications — one click at a time.
          </p>
        </div>

        <div className="flex gap-4">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-[#2dcfbe] to-[#1ab8a8] text-black hover:brightness-110 font-semibold px-8 h-11 shadow-lg shadow-[#2dcfbe]/20">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <SignInButton mode="modal">
              <Button className="bg-gradient-to-r from-[#2dcfbe] to-[#1ab8a8] text-black hover:brightness-110 font-semibold px-8 h-11 shadow-lg shadow-[#2dcfbe]/20">
                Get Started
              </Button>
            </SignInButton>
          )}
          <Link href="/opportunities">
            <Button variant="outline" className="border-white/15 text-white hover:bg-white/8 hover:border-white/30 h-11 px-8">
              Browse Opportunities
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-12 mt-4 text-center">
          {[
            { label: "Scholarships Indexed", value: "200+", color: "text-[#2dcfbe]" },
            { label: "Avg. Match Time", value: "< 2s", color: "text-[#c4195a]" },
            { label: "Forms Auto-Filled", value: "1-click", color: "text-white" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-zinc-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {["Scout scrapes 15 portals", "LLM deadline parsing", "Auto-fill any form", "Chrome extension"].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs">
              {f}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
