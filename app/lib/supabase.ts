import { createClient } from '@supabase/supabase-js';

// Supabase 대시보드 주소창에 있는 project/ 뒤의 문자열을 여기에 정확히 입력해 주세요.
// 예: https://[프로젝트ID].supabase.co
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mznhpyevgpxroehclhw.supabase.co'; 

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bmh5cHlldmdweHJvZWhjbGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjQ3MjMsImV4cCI6MjEwMDYwMDcyM30.40NpaGQW_Fyr5tvyIsiiXfTNMSzIkcWTghFwhBo00XU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);