import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((request) => {
  const isLoggedIn = Boolean(request.auth);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
