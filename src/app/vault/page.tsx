"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase, type Vault } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NavLogo } from "@/components/logo";

export default function VaultPage() {
  const { user, isLoaded } = useUser();
  const [vault, setVault] = useState<Partial<Vault>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("vault")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setVault(data);
      });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus("idle");

    const payload = {
      user_id: user.id,
      full_name: vault.full_name ?? "",
      bio_text: vault.bio_text ?? null,
      is_first_gen: vault.is_first_gen ?? false,
      gpa: vault.gpa ?? null,
    };

    const { error } = await supabase.from("vault").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    setStatus(error ? "error" : "saved");
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <NavLogo />
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </nav>

      <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-1">My Vault</h1>
        <p className="text-zinc-500 text-sm mb-8">
          This data powers your match scores and auto-fill. It never leaves your account.
        </p>

        <Card className="bg-zinc-950 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-zinc-500 font-mono">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={vault.full_name ?? ""}
                  onChange={(e) => setVault((v) => ({ ...v, full_name: e.target.value }))}
                  className="bg-black border-white/20 focus:border-white"
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio_text">Personal Statement / Bio</Label>
                <Textarea
                  id="bio_text"
                  value={vault.bio_text ?? ""}
                  onChange={(e) => setVault((v) => ({ ...v, bio_text: e.target.value }))}
                  className="bg-black border-white/20 focus:border-white min-h-32"
                  placeholder="Tell scholarships about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA (0.0 – 4.0)</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={vault.gpa ?? ""}
                    onChange={(e) =>
                      setVault((v) => ({ ...v, gpa: e.target.value ? parseFloat(e.target.value) : undefined }))
                    }
                    className="bg-black border-white/20 focus:border-white"
                    placeholder="3.85"
                  />
                </div>

                <div className="space-y-2">
                  <Label>First-Generation Student?</Label>
                  <div className="flex items-center gap-3 h-10">
                    <button
                      type="button"
                      onClick={() => setVault((v) => ({ ...v, is_first_gen: true }))}
                      className={`px-4 h-8 rounded text-sm font-medium border transition-colors ${
                        vault.is_first_gen
                          ? "bg-white text-black border-white"
                          : "border-white/20 text-zinc-400 hover:border-white/40"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setVault((v) => ({ ...v, is_first_gen: false }))}
                      className={`px-4 h-8 rounded text-sm font-medium border transition-colors ${
                        vault.is_first_gen === false
                          ? "bg-white text-black border-white"
                          : "border-white/20 text-zinc-400 hover:border-white/40"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black hover:bg-zinc-200 font-semibold"
                >
                  {saving ? "Saving..." : "Save Vault"}
                </Button>
                {status === "saved" && (
                  <span className="text-green-400 text-sm">Saved.</span>
                )}
                {status === "error" && (
                  <span className="text-red-400 text-sm">Error saving. Try again.</span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
