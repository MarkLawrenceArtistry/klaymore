import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  global: {
    // 1. Send headers telling the browser network layer not to cache
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    // 2. Override Next.js's fetch behavior to strictly forbid data caching
    fetch: (url, options) => {
      return fetch(url, { ...options, cache: 'no-store' });
    },
  },
})