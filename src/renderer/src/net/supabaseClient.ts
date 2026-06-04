import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.RENDERER_VITE_SUPABASE_URL
const key = import.meta.env.RENDERER_VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  throw new Error('Faltam RENDERER_VITE_SUPABASE_URL / RENDERER_VITE_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 5 } },
})
