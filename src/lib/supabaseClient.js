import { createClient } from "@supabase/supabase-js";

export const confirmClientTable = "client_tax_season_confirmations";
export const intakeTable = "client_intake_submissions";
export const intakeDocumentsTable = "client_intake_documents";
export const intakeFilesBucket = "intake-documents";
let client;

export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Le formulaire est temporairement indisponible. Veuillez contacter notre équipe.");
  }
  client ??= createClient(url, key, {
    db: { schema: "public" },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: window.location.pathname === "/ouverture-dossier" },
  });
  return client;
}
