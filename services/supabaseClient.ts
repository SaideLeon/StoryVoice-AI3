import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/schema';

// NOTE: In a real production app, these should be in a .env file.
// For this environment, we will look for them in process.env or use the provided defaults.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ggbksyobxoucupljlerw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_R875Aw2rIUXn6HFQqlLCOQ_Eiu2Exyl';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
