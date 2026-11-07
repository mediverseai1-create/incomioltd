import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const p = req.nextUrl.pathname;
  const protectedPath = p.startsWith('/app') || p.startsWith('/onboarding');
  if (!user && protectedPath) { const u = req.nextUrl.clone(); u.pathname = '/login'; u.searchParams.set('next', p); return NextResponse.redirect(u); }
  if (user && (p === '/login' || p === '/signup')) { const u = req.nextUrl.clone(); u.pathname = '/app'; u.search = ''; return NextResponse.redirect(u); }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/billing/confirm).*)'] };
