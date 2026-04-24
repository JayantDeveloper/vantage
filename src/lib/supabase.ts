import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser/client-side client (uses anon key + RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (bypasses RLS — server only)
export function createAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export type Vault = {
  id: string;
  user_id: string;
  full_name: string;
  bio_text: string | null;
  is_first_gen: boolean;
  gpa: number | null;
  created_at: string;
  updated_at: string;
};

export type Opportunity = {
  id: string;
  title: string;
  url: string;
  deadline: string | null;
  match_score: number | null;
  description: string | null;
  source: string | null;
  scraped_at: string;
};
