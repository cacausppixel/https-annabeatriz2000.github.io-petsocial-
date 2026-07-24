import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.PETSOCIAL_CONFIG ?? {};
const supabaseUrl = config.SUPABASE_URL?.trim();
const supabaseAnonKey = config.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("SEU-PROJETO") || supabaseAnonKey.includes("SUA_SUPABASE")) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em window.PETSOCIAL_CONFIG antes de usar o app.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
