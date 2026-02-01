import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './src/i18n/config';
import { updateSession } from './src/lib/supabase/middleware';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Don't show /en in the URL for English
});

export default async function proxy(request: NextRequest) {
  // Skip proxy processing for API routes, static files, and Next.js internals
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    /\.[^/]+$/.test(pathname) // Files with extensions (e.g., .ico, .png)
  ) {
    return NextResponse.next();
  }

  // Handle locale routing first
  const intlResponse = intlMiddleware(request);

  // Then handle Supabase session
  const supabaseResponse = await updateSession(request);

  // If Supabase returned a redirect (e.g., to login), use that
  if (supabaseResponse.status === 307 || supabaseResponse.status === 308) {
    return supabaseResponse;
  }

  // Merge session cookies from Supabase into the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  // Return the intl response with session cookies
  return intlResponse;
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - _next (Next.js internals)
  // - Static files (images, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
