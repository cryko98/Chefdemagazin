import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnvVar = (key: string): string => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
            return (import.meta as any).env[key];
        }
        // Use window.process if available, otherwise just check process
        const proc = (window as any).process || (typeof process !== 'undefined' ? process : null);
        if (proc?.env?.[key]) {
            return proc.env[key];
        }
    } catch (e) {
        console.warn(`Error reading env var ${key}`, e);
    }
    return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || '';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';

// Fallback to a dummy URL if empty, but log a clear warning. 
// createClient throws an error if the URL is not a valid string starting with http.
const safeUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase keys missing! Running in limited mode.');
}

export const supabase = createClient(safeUrl, safeKey);