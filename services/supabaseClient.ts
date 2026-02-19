import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/schema';

// NOTE: In a real production app, these should be in a .env file.
// For this environment, we will look for them in process.env or prompt the user if missing.
// You must set your Supabase URL and Anon Key here or via environment variables.

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
