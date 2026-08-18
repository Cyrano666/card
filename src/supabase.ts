import { createClient } from '@supabase/supabase-js'
// This is Supabase's publishable client key. It is safe to ship in a web app;
// all data access is protected by the RLS policies in supabase/schema.sql.
const url=import.meta.env.VITE_SUPABASE_URL||'https://jyrwqalbahtpraylvcml.supabase.co'
const key=import.meta.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_194j3LfynND_2RLjz6JVIw_A2oy-t1Z'
export const configured=true
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}})
