export const dynamic = "force-dynamic";

import { NavLogo } from "@/components/logo";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { createAdminClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let vault = null;
  let opps: { id: string; title: string; url: string; deadline: string | null; match_score: number | null; description: string | null; source: string | null; scraped_at: string }[] | null = null;

  try {
    const admin = createAdminClient();
    const [vaultRes, oppsRes] = await Promise.all([
      admin.from("vault").select("*").eq("user_id", userId).single(),
      admin.from("opportunities").select("*").order("match_score", { ascending: false }).limit(5),
    ]);
    vault = vaultRes.data;
    opps = oppsRes.data;
  } catch {
    // Service role key not yet configured — show empty state
  }

  const deadlineSoon = opps?.filter((o) => {
    if (!o.deadline) return false;
    const days = Math.ceil(
      (new Date(o.deadline).getTime() - Date.now()) / 86400000
    );
    return days >= 0 && days <= 30;
  });

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 w-[500px] h-[400px] rounded-full bg-[#2dcfbe]/6 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-[#c4195a]/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-5 border-b border-white/8">
        <NavLogo />
        <div className="flex items-center gap-6">
          <Link href="/opportunities" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Opportunities
          </Link>
          <Link href="/vault" className="text-sm text-zinc-400 hover:text-white transition-colors">
            My Vault
          </Link>
          <UserButton />
        </div>
      </nav>

      <main className="relative flex-1 px-8 py-10 max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {vault ? (
              <>Welcome back, <span className="text-[#2dcfbe]">{vault.full_name.split(" ")[0]}</span>.</>
            ) : "Dashboard"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {vault ? "Here's your scholarship snapshot." : "Set up your Vault to get personalized matches."}
          </p>
        </div>

        {/* Vault setup prompt */}
        {!vault && (
          <div className="rounded-xl border border-[#c4195a]/30 bg-[#c4195a]/8 p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#c4195a]">Your Vault is empty</p>
              <p className="text-zinc-400 text-sm mt-0.5">
                Add your profile data so Vantage can score opportunities for you.
              </p>
            </div>
            <Link href="/vault">
              <Button className="bg-[#c4195a] text-white hover:bg-[#a8144d] font-semibold shrink-0">
                Set Up Vault
              </Button>
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-zinc-950/60 border-[#2dcfbe]/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                Total Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[#2dcfbe]">{opps?.length ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/60 border-[#c4195a]/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                Deadlines This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${(deadlineSoon?.length ?? 0) > 0 ? "text-[#c4195a]" : "text-zinc-400"}`}>
                {deadlineSoon?.length ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/60 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                Your GPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-white">{vault?.gpa?.toFixed(2) ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Separator className="bg-white/8" />

        {/* Top matches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Matches</h2>
            <Link href="/opportunities">
              <Button variant="ghost" className="text-[#2dcfbe] hover:text-[#2dcfbe] hover:bg-[#2dcfbe]/10 text-sm h-8">
                View all →
              </Button>
            </Link>
          </div>

          {!opps || opps.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-zinc-950/40 py-16 text-center">
              <p className="text-zinc-500 text-sm">No opportunities indexed yet.</p>
              <p className="text-zinc-600 text-xs mt-1">
                Run <code className="font-mono text-zinc-400">npm run scout</code> to populate.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {opps.map((opp) => {
                const daysLeft = opp.deadline
                  ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                  : null;
                const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;

                return (
                  <Card key={opp.id} className={`bg-zinc-950/60 backdrop-blur-sm transition-all hover:border-white/20 ${urgent ? "border-[#c4195a]/30" : "border-white/8"}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-medium">{opp.title}</p>
                        <p className={`text-xs ${urgent ? "text-[#c4195a]" : "text-zinc-500"}`}>
                          {opp.deadline
                            ? `Deadline: ${new Date(opp.deadline).toLocaleDateString()} ${urgent ? `(${daysLeft}d left)` : ""}`
                            : "No deadline listed"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {opp.match_score != null && (
                          <Badge
                            className={
                              opp.match_score >= 80
                                ? "bg-[#2dcfbe]/15 text-[#2dcfbe] border-[#2dcfbe]/30"
                                : opp.match_score >= 50
                                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
                                : "bg-zinc-800/60 text-zinc-400 border-white/10"
                            }
                          >
                            {opp.match_score.toFixed(0)}% match
                          </Badge>
                        )}
                        <a href={opp.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/8 h-8 text-xs">
                            Apply →
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
