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

  const admin = createAdminClient();

  const [{ data: vault }, { data: opps }] = await Promise.all([
    admin.from("vault").select("*").eq("user_id", userId).single(),
    admin
      .from("opportunities")
      .select("*")
      .order("match_score", { ascending: false })
      .limit(5),
  ]);

  const deadlineSoon = opps?.filter((o) => {
    if (!o.deadline) return false;
    const days = Math.ceil(
      (new Date(o.deadline).getTime() - Date.now()) / 86400000
    );
    return days >= 0 && days <= 30;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Vantage
        </Link>
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

      <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {vault ? `Welcome back, ${vault.full_name}.` : "Set up your Vault to get personalized matches."}
          </p>
        </div>

        {/* Vault status */}
        {!vault && (
          <Card className="bg-zinc-950 border-yellow-500/30">
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="font-semibold text-yellow-400">Your Vault is empty</p>
                <p className="text-zinc-500 text-sm mt-0.5">
                  Add your profile data so Vantage can score opportunities for you.
                </p>
              </div>
              <Link href="/vault">
                <Button className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold">
                  Set Up Vault
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: "Total Opportunities", value: opps?.length ?? 0 },
            { title: "Deadlines This Month", value: deadlineSoon?.length ?? 0 },
            { title: "Your GPA", value: vault?.gpa?.toFixed(2) ?? "—" },
          ].map(({ title, value }) => (
            <Card key={title} className="bg-zinc-950 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="bg-white/10" />

        {/* Top matches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Matches</h2>
            <Link href="/opportunities">
              <Button variant="ghost" className="text-zinc-400 hover:text-white text-sm h-8">
                View all →
              </Button>
            </Link>
          </div>

          {!opps || opps.length === 0 ? (
            <p className="text-zinc-600 text-sm">
              No opportunities indexed yet. Run the Scout to populate.
            </p>
          ) : (
            <div className="space-y-3">
              {opps.map((opp) => (
                <Card key={opp.id} className="bg-zinc-950 border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{opp.title}</p>
                      <p className="text-zinc-500 text-xs">
                        {opp.deadline
                          ? `Deadline: ${new Date(opp.deadline).toLocaleDateString()}`
                          : "No deadline listed"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-8 text-xs">
                          Apply →
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
