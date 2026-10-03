import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('YOUR_PROJECT_REF') &&
    supabaseAnonKey !== 'your-anon-public-key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }
  return supabase;
}

export function rpcErrorMessage(error) {
  return error?.message || 'Request failed';
}

export const AUTHHOP_URL = import.meta.env.VITE_AUTHHOP_URL || 'http://localhost:5173';
export const DEMO_URL = import.meta.env.VITE_DEMO_URL || 'http://localhost:5174';
export const DEMO_SITE_ID = import.meta.env.VITE_DEMO_SITE_ID || 'demo-app';
