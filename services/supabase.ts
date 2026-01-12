import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables from either import.meta.env or process.env
const getEnvVar = (key: string) => {
    try {
        // Priority 1: import.meta.env (Vite standard)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
            return (import.meta as any).env[key];
        }
        // Priority 2: process.env (Node.js / Polyfills / Webpack)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {
        console.warn(`Error reading env var ${key}`, e);
    }
    return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. The app will load in a limited demo mode, but authentication and database features will fail.');
}

// Create client with fallback values to prevent "white screen" crash on load.
// Calls will fail if keys are invalid, but the UI will render.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);