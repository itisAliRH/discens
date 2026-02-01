import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { locales, defaultLocale } from './src/i18n/config';
import { updateSession } from './src/lib/supabase/middleware';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Don't show /en in the URL for English
});

export async function middleware(request: NextRequest) {
  // Handle locale routing first
  const intlResponse = intlMiddleware(request);
  
  // Then handle Supabase session
  const supabaseResponse = await updateSession(request);
  
  // If Supabase returned a redirect (e.g., to login), use that
  if (supabaseResponse.status === 307 || supabaseResponse.status === 308) {
    return supabaseResponse;
  }
  
  // Otherwise, use the intl response
  return intlResponse;
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - _next (Next.js internals)
  // - Static files (images, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

// Ensure middleware runs on edge runtime
export const runtime = 'edge';
