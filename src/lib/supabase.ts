import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase - Projeto MMicro
const supabaseUrl = 'https://kfpuldiucjxtyhbhnndi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcHVsZGl1Y2p4dHloYmhubmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MzQwNjUsImV4cCI6MjA2MjMxMDA2NX0.1cxEE6sGlUkJ7tbBtPAGYtNVczmSlf4E9Z4Tyy791Nk'

// Cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para a tabela images
export interface ImageRecord {
  id: string
  original_id: string
  original_url: string
  storage_url?: string
  storage_path?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  download_status: string
  error_message?: string
  created_at: string
  updated_at: string
  processed_at?: string
  isOk: boolean
  inSystem: boolean
} 