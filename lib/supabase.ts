import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guard clause buat mastiin env lo gak kosong pas di-load
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase Environment Variables! Cek lagi file .env.local lo, bro.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);