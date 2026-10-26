import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aroxfrqpvcbnaslmaevg.supabase.co'
const supabaseAnonKey = 'sb_publishable_I75czTheq4WMTgYAOnwSag_L0Ny1z0u'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
