/** Vercel Edge: gate HTML pages (API enforces real cookie validation). */
export const config = {
  matcher: ['/((?!api/|login\\.html|login\\.js|_next/|favicon\\.ico|favicon\\.svg).*)'],
};

function hasAuthCookie(cookieHeader) {
  const token = (cookieHeader ?? '').match(/(?:^|;\s*)soil_auth=([^;]+)/)?.[1]?.trim();
  return Boolean(token && token.length === 64 && /^[a-f0-9]+$/.test(token));
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname === '/login.html' || url.pathname === '/login.js') {
    return;
  }

  if (hasAuthCookie(request.headers.get('cookie'))) {
    return;
  }

  const login = new URL('/login.html', request.url);
  login.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(login, 302);
}
