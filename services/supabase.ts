import { createClient } from '@supabase/supabase-js';

// Safely access environment variables. 
// We default to an empty object if (import.meta as any).env is undefined to prevent crashes.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Please check your .env file or Vercel project settings.');
}

// Create client with fallback values to prevent "white screen" crash on load.
// Calls will fail if keys are invalid, but the UI will render (likely showing Auth screen or loading).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);