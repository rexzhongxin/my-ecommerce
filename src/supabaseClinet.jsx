import { createClient } from '@supabase/supabase-js'

// 删掉结尾的 /rest/v1/，只保留域名部分
const supabaseUrl = 'https://lewgqvnvjeyolpfrbpik.supabase.co'
const supabaseAnonKey = 'sb_publishable_0vOC_Y5l9JPs__D5T8C3cw_b1s_txoR'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)