import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://rsjcdtpmxekyevhqqfdn.supabase.co';
const defaultPublishableKey = 'sb_publishable_9MSBWqMaKIsSyMYaLkxtAg_YiMYs6Rs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? defaultSupabaseUrl;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? defaultPublishableKey;

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    persistSession: true
  }
});

export const storageBucketId = 'study-attachments';

export function isSupabaseAttachment(src: string): boolean {
  return src.startsWith(`supabase://${storageBucketId}/`);
}

export function attachmentPathFromSrc(src: string): string {
  return src.replace(`supabase://${storageBucketId}/`, '');
}
