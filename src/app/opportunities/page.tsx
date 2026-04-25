"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { NavLogo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Opportunity, type OpportunityCategory } from "@/lib/supabase";

type FilterTab = "all" | OpportunityCategory;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "scholarship", label: "Scholarships" },
  { key: "grant",       label: "Grants" },
  { key: "event",       label: "Events" },
  { key: "news",        label: "News" },
];

export default function OpportunitiesPage() {
  const [opps, setOpps]       = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterTab>("all");

  useEffect(() => {
    fetch("/api/opportunities")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setOpps(data); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? opps : opps.filter((o) => o.category === filter);

  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = t.key === "all" ? opps.length : opps.filter((o) => o.category === t.key).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[600px] h-[300px] rounded-full bg-[#2dcfbe]/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-[#1a2948]/50 blur-[80px]" />
      </div>

      <nav className="relative flex items-center justify-between px-8 py-5 border-b border-white/8">
        <NavLogo />
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/vault" className="text-sm text-zinc-400 hover:text-white transition-colors">My Vault</Link>
          <UserButton />
        </div>
      </nav>

      <main className="relative flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-zinc-500 text-sm mt-1">
            <span className="text-[#2dcfbe] font-semibold">{filtered.length}</span>{" "}
            {filter === "all" ? "opportunities" : TABS.find(t => t.key === filter)?.label.toLowerCase()} indexed
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map((tab) => {
            const active = filter === tab.key;
            const count  = counts[tab.key] ?? 0;
            if (count === 0 && tab.key !== "all") return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? "bg-[#2dcfbe] text-black border-[#2dcfbe]"
                    : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${active ? "text-black/60" : "text-zinc-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-zinc-950/40 py-24 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#2dcfbe]/10 border border-[#2dcfbe]/20 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-[#2dcfbe]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-zinc-400 font-medium">No {filter === "all" ? "opportunities" : filter + "s"} yet.</p>
            {filter === "all" && (
              <p className="text-zinc-600 text-sm">
                Run <code className="font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">npm run scout</code> to populate.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((opp) => {
              const daysLeft = opp.deadline
                ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                : null;
              const urgent   = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
              const upcoming = daysLeft !== null && daysLeft > 14 && daysLeft <= 60;

              return (
                <Card
                  key={opp.id}
                  className={`bg-zinc-950/60 backdrop-blur-sm transition-all hover:translate-y-[-1px] hover:shadow-lg ${
                    urgent   ? "border-[#c4195a]/35 hover:border-[#c4195a]/60 hover:shadow-[#c4195a]/10"
                    : upcoming ? "border-yellow-500/20 hover:border-yellow-500/40"
                    : "border-white/8 hover:border-white/20"
                  }`}
                >
                  <CardContent className="flex items-start justify-between py-5 gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{opp.title}</p>
                        {urgent && (
                          <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-[#c4195a] bg-[#c4195a]/10 border border-[#c4195a]/25 px-1.5 py-0.5 rounded">
                            {daysLeft === 0 ? "today" : `${daysLeft}d`}
                          </span>
                        )}
                        <CategoryPill category={opp.category} />
                      </div>
                      {opp.description && (
                        <p className="text-zinc-500 text-sm line-clamp-2">{opp.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        {opp.deadline && (
                          <span className={urgent ? "text-[#c4195a]" : upcoming ? "text-yellow-500/80" : "text-zinc-600"}>
                            {opp.category === "event" ? "Starts" : opp.category === "news" ? "Published" : "Deadline"}:{" "}
                            {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {opp.source && <span className="text-zinc-700">· {opp.source}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {opp.match_score != null && (
                        <Badge className={
                          opp.match_score >= 80 ? "bg-[#2dcfbe]/15 text-[#2dcfbe] border-[#2dcfbe]/30"
                          : opp.match_score >= 50 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
                          : "bg-zinc-800/60 text-zinc-500 border-white/8"
                        }>
                          {opp.match_score.toFixed(0)}% match
                        </Badge>
                      )}
                      <a href={opp.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-[#2dcfbe]/10 border border-[#2dcfbe]/25 text-[#2dcfbe] hover:bg-[#2dcfbe]/20 h-8 text-xs font-medium">
                          {opp.category === "event" ? "View →" : opp.category === "news" ? "Read →" : "Apply →"}
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category || category === "scholarship") return null;
  const styles: Record<string, string> = {
    event: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    news:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
    grant: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  };
  return (
    <span className={`shrink-0 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles[category] ?? "bg-zinc-800 text-zinc-500 border-white/10"}`}>
      {category}
    </span>
  );
}
