import { createAdminClient } from "@/lib/supabase";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Force dynamic — Supabase admin client requires the service role key at runtime,
// and opportunities data changes frequently enough that ISR pre-rendering isn't worth it.
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  let opps: import("@/lib/supabase").Opportunity[] | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("opportunities")
      .select("*")
      .order("match_score", { ascending: false });
    opps = data;
  } catch {
    // Service role key not yet configured
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-bold tracking-tight">Vantage</Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/vault" className="text-sm text-zinc-400 hover:text-white transition-colors">
            My Vault
          </Link>
          <UserButton />
        </div>
      </nav>

      <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {opps?.length ?? 0} scholarships & grants indexed
            </p>
          </div>
        </div>

        {!opps || opps.length === 0 ? (
          <div className="text-center py-24 text-zinc-600">
            <p className="text-lg">No opportunities yet.</p>
            <p className="text-sm mt-1">Run <code className="font-mono text-zinc-400">npm run scout</code> to populate the database.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opps.map((opp) => (
              <Card key={opp.id} className="bg-zinc-950 border-white/10 hover:border-white/25 transition-colors">
                <CardContent className="flex items-start justify-between py-5 gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-semibold truncate">{opp.title}</p>
                    {opp.description && (
                      <p className="text-zinc-500 text-sm line-clamp-2">{opp.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      {opp.deadline && (
                        <span>
                          Deadline: {new Date(opp.deadline).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      )}
                      {opp.source && <span>· {opp.source}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {opp.match_score != null && (
                      <Badge
                        className={
                          opp.match_score >= 80
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : opp.match_score >= 50
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-zinc-800 text-zinc-400 border-white/10"
                        }
                      >
                        {opp.match_score.toFixed(0)}% match
                      </Badge>
                    )}
                    <a href={opp.url} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 h-8 text-xs"
                      >
                        Apply →
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
