import { createBrowserClient } from '@supabase/ssr';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton — mismo storage (cookies) que usa la login page
export const supabaseBrowser = createBrowserClient(url, anon);

export async function getAdminTokenFresh(): Promise<string> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? localStorage.getItem('cp_admin_token') ?? '';
}

export async function getOwnerTokenFresh(): Promise<string> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? localStorage.getItem('cp_owner_token') ?? '';
}
