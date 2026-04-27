import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/trade(.*)',
  '/dashboard(.*)',
  '/account(.*)',
  '/analysis(.*)',
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
