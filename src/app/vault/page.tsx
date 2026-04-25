"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { type Vault } from "@/lib/supabase";
import { type ParsedVaultFields } from "@/app/api/vault/parse/route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NavLogo } from "@/components/logo";
import Link from "next/link";

type SaveStatus = "idle" | "parsing" | "saving" | "saved" | "error";

const PARSING_STEPS = [
  "Reading your context…",
  "Extracting skills & GPA…",
  "Building your profile…",
];

export default function VaultPage() {
  const { user, isLoaded } = useUser();
  const [vault, setVault] = useState<Partial<Vault>>({ skills: [] });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [parsingStep, setParsingStep] = useState(0);
  const [skillInput, setSkillInput] = useState("");
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing vault via server route (bypasses RLS)
  useEffect(() => {
    if (!user) return;
    fetch("/api/vault/load")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setVault({ ...data, skills: data.skills ?? [] });
      });
  }, [user]);

  // Animate parsing steps
  useEffect(() => {
    if (status === "parsing") {
      setParsingStep(0);
      stepTimer.current = setInterval(() => {
        setParsingStep((p) => Math.min(p + 1, PARSING_STEPS.length - 1));
      }, 900);
    } else {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, [status]);

  // ── Skill tag helpers ──────────────────────────────────────────────────
  function addSkill(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const toAdd = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    setVault((v) => ({
      ...v,
      skills: [...new Set([...(v.skills ?? []), ...toAdd])],
    }));
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setVault((v) => ({ ...v, skills: (v.skills ?? []).filter((s) => s !== skill) }));
  }

  // ── Save & Parse ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrorMsg("");

    const hasContextDump = (vault.context_dump ?? "").trim().length > 0;

    // ── Step 1: Parse (only if there's a context dump) ──────────────────
    if (hasContextDump) {
      setStatus("parsing");

      try {
        const res = await fetch("/api/vault/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contextDump: vault.context_dump }),
        });

        if (res.ok) {
          const { parsed }: { parsed: ParsedVaultFields } = await res.json();

          setVault((v) => ({
            ...v,
            // Only overwrite if field is currently empty / user hasn't manually set it
            full_name:   v.full_name   || parsed.full_name   || v.full_name   || "",
            gpa:         v.gpa         ?? parsed.gpa,
            major:       v.major       || parsed.major        || null,
            bio_text:    v.bio_text    || parsed.bio_text     || null,
            is_first_gen: v.is_first_gen ?? parsed.is_first_gen ?? false,
            skills:      [
              ...new Set([...(v.skills ?? []), ...(parsed.skills ?? [])]),
            ],
          }));
        }
      } catch {
        // Non-fatal: we still save what we have
      }
    }

    // ── Step 2: Save to Supabase ─────────────────────────────────────────
    setStatus("saving");

    const payload = {
      user_id:      user.id,
      full_name:    vault.full_name ?? "",
      bio_text:     vault.bio_text ?? null,
      is_first_gen: vault.is_first_gen ?? false,
      gpa:          vault.gpa ?? null,
      context_dump: vault.context_dump ?? null,
      narrative:    vault.narrative ?? null,
      major:        vault.major ?? null,
      skills:       vault.skills ?? [],
    };

    // Re-read vault state after parse mutation, then save via server route
    setVault((latest) => {
      const finalPayload = { ...payload, ...latest, user_id: user.id };
      fetch("/api/vault/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      }).then((r) => {
        setStatus(r.ok ? "saved" : "error");
        if (!r.ok) r.json().then((e) => setErrorMsg(e.error ?? "Save failed"));
        setTimeout(() => setStatus("idle"), 3000);
      });
      return latest;
    });
  }

  if (!isLoaded) return null;

  const isParsing = status === "parsing";
  const isBusy = status === "parsing" || status === "saving";

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 right-1/4 w-[500px] h-[350px] rounded-full bg-[#2dcfbe]/6 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[300px] rounded-full bg-[#c4195a]/5 blur-[90px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-5 border-b border-white/8">
        <NavLogo />
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </nav>

      <main className="relative flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Vault</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Paste your resume or story — Vantage extracts the rest automatically.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── SECTION 1: CONTEXT DUMP ─────────────────────────────────── */}
          <Card className="bg-zinc-950/60 border-[#2dcfbe]/15 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Context Dump
                <Badge className="bg-[#c4195a]/20 text-[#c4195a] border-[#c4195a]/30 text-[10px] tracking-wider font-mono">
                  AUTO-PARSED
                </Badge>
              </CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                Paste your full resume, LinkedIn bio, or anything about you. The LLM will extract
                GPA, major, skills, and more automatically when you save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="context_dump"
                value={vault.context_dump ?? ""}
                onChange={(e) => setVault((v) => ({ ...v, context_dump: e.target.value }))}
                className="bg-black border-white/15 focus:border-white/50 min-h-52 font-mono text-sm text-zinc-300 placeholder:text-zinc-700 resize-y"
                placeholder={`Jane Doe\nCS Major · University of Maryland · GPA 3.9\n\nExperience:\n- Software Engineering Intern, Google (Summer 2024)\n- Research Assistant, UMD HCI Lab\n\nSkills: Python, React, machine learning, public speaking\n\nFirst-generation college student. Passionate about AI for social good…`}
              />
              {isParsing && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-[#2dcfbe] border-t-transparent animate-spin" />
                  {PARSING_STEPS[parsingStep]}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 2: NARRATIVE ────────────────────────────────────── */}
          <Card className="bg-zinc-950/60 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Your Narrative</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                Tell your story in your own words. This is used verbatim in personal statement fields —
                write as if answering "Tell us about yourself."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="narrative"
                value={vault.narrative ?? ""}
                onChange={(e) => setVault((v) => ({ ...v, narrative: e.target.value }))}
                className="bg-black border-white/15 focus:border-white/50 min-h-40 text-sm text-zinc-200 placeholder:text-zinc-700 resize-y"
                placeholder="Growing up as a first-generation college student, I learned early that opportunity doesn't always knock twice…"
              />
            </CardContent>
          </Card>

          {/* ── SECTION 3: PARSED PROFILE ───────────────────────────────── */}
          <Card className="bg-zinc-950/60 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Parsed Profile
                <span className="text-xs text-zinc-600 font-normal font-mono">auto-filled · editable</span>
              </CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                Extracted from your Context Dump. Edit any field before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Row: Name + Major */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs text-zinc-400 uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={vault.full_name ?? ""}
                    onChange={(e) => setVault((v) => ({ ...v, full_name: e.target.value }))}
                    className="bg-black border-white/15 focus:border-white/50 text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="major" className="text-xs text-zinc-400 uppercase tracking-wider">
                    Major / Field
                  </Label>
                  <Input
                    id="major"
                    value={vault.major ?? ""}
                    onChange={(e) => setVault((v) => ({ ...v, major: e.target.value }))}
                    className="bg-black border-white/15 focus:border-white/50 text-sm"
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              {/* Row: GPA + First-Gen */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gpa" className="text-xs text-zinc-400 uppercase tracking-wider">
                    GPA (0.0 – 4.0)
                  </Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={vault.gpa ?? ""}
                    onChange={(e) =>
                      setVault((v) => ({
                        ...v,
                        gpa: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    className="bg-black border-white/15 focus:border-white/50 text-sm"
                    placeholder="3.85"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                    First-Generation?
                  </Label>
                  <div className="flex items-center gap-2 h-9">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setVault((v) => ({ ...v, is_first_gen: val }))}
                        className={`px-4 h-8 rounded text-sm font-medium border transition-colors ${
                          vault.is_first_gen === val
                            ? "bg-white text-black border-white"
                            : "border-white/20 text-zinc-400 hover:border-white/40"
                        }`}
                      >
                        {val ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label htmlFor="bio_text" className="text-xs text-zinc-400 uppercase tracking-wider">
                  Summary Bio
                  <span className="ml-2 normal-case text-zinc-600 font-normal">(used in short-answer fields)</span>
                </Label>
                <Textarea
                  id="bio_text"
                  value={vault.bio_text ?? ""}
                  onChange={(e) => setVault((v) => ({ ...v, bio_text: e.target.value }))}
                  className="bg-black border-white/15 focus:border-white/50 min-h-20 text-sm text-zinc-200 placeholder:text-zinc-700 resize-y"
                  placeholder="2–3 sentence professional summary…"
                />
              </div>

              <Separator className="bg-white/8" />

              {/* Skills */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                  Skills
                  <span className="ml-2 normal-case text-zinc-600 font-normal">{vault.skills?.length ?? 0} tags</span>
                </Label>

                {/* Tag cloud */}
                {(vault.skills?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(vault.skills ?? []).map((skill) => (
                      <Badge
                        key={skill}
                        className="bg-[#2dcfbe]/10 text-[#2dcfbe] border-[#2dcfbe]/25 text-xs cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        onClick={() => removeSkill(skill)}
                        title="Click to remove"
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Skill input */}
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }
                      if (e.key === "," ) { e.preventDefault(); addSkill(skillInput); }
                    }}
                    className="bg-black border-white/15 focus:border-white/50 text-sm flex-1"
                    placeholder="Add skill — press Enter or comma to confirm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkill(skillInput)}
                    className="border-white/20 text-zinc-300 hover:bg-white/10 shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-zinc-700">
                  Tip: paste a comma-separated list to add multiple at once.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── SAVE BUTTON ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 pt-1">
            <Button
              type="submit"
              disabled={isBusy}
              className="bg-gradient-to-r from-[#2dcfbe] to-[#1ab8a8] text-black hover:brightness-110 font-semibold min-w-36 relative shadow-lg shadow-[#2dcfbe]/20"
            >
              {isBusy ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  {status === "parsing" ? "Parsing…" : "Saving…"}
                </span>
              ) : "Save & Parse"}
            </Button>

            {status === "saved" && (
              <span className="text-green-400 text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Vault updated
              </span>
            )}
            {status === "error" && (
              <span className="text-red-400 text-sm">{errorMsg || "Save failed — try again."}</span>
            )}
            {status === "idle" && (vault.context_dump ?? "").trim().length > 0 && (
              <span className="text-xs text-zinc-600">
                LLM will parse your context dump on save
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
