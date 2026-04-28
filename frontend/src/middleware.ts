import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public read-only surfaces (analysis pages, ratings, RV pipeline) don't need
// auth — the data they show is global, not user-scoped, so anyone hitting the
// site can browse them. Only routes that read or write user-scoped Alpaca
// state (trade, dashboard, account) require Clerk + Alpaca OAuth.
const isProtectedRoute = createRouteMatcher([
  '/trade(.*)',
  '/dashboard(.*)',
  '/account(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect({
      unauthenticatedUrl: new URL('/signin', req.url).toString(),
    });
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/login(.*)', '/signup(.*)'],
};
