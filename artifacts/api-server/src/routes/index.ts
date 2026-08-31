import { Router, type IRouter, type RequestHandler } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import authRouter from "./auth";
import roleAccessRouter from "./role-access";
import onboardingRouter from "./onboarding";
import exploreRouter from "./explore";
import favoritesRouter from "./favorites";
import hotelsRouter from "./hotels";
import bookingsRouter from "./bookings";
import notificationsRouter from "./notifications";
import reviewsRouter from "./reviews";
import vendorPortalRouter from "./vendor-portal";
import adminRouter from "./admin";
import reportsRouter from "./reports";

const router: IRouter = Router();

function mountOnPaths(childRouter: RequestHandler, matches: (path: string) => boolean): void {
  router.use((req, res, next) => {
    if (matches(req.path)) {
      childRouter(req, res, next);
      return;
    }
    next();
  });
}

function hasPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

router.use(healthRouter);
router.use(catalogRouter);
router.use(exploreRouter);
mountOnPaths(favoritesRouter, (path) => hasPrefix(path, "/v1/favorites"));
router.use(hotelsRouter);
mountOnPaths(bookingsRouter, (path) => hasPrefix(path, "/v1/bookings"));
mountOnPaths(notificationsRouter, (path) => hasPrefix(path, "/v1/notifications"));
mountOnPaths(
  reviewsRouter,
  (path) => hasPrefix(path, "/v1/reviews") || /^\/v1\/hotels\/[^/]+\/reviews(?:\/|$)/.test(path),
);
router.use(onboardingRouter);
mountOnPaths(authRouter, (path) => hasPrefix(path, "/v1/auth") || hasPrefix(path, "/v1/me"));
mountOnPaths(vendorPortalRouter, (path) => hasPrefix(path, "/v1/vendor"));
mountOnPaths(adminRouter, (path) => hasPrefix(path, "/v1/admin"));
mountOnPaths(reportsRouter, (path) => hasPrefix(path, "/v1/admin/reports") || hasPrefix(path, "/v1/vendor/reports"));
mountOnPaths(roleAccessRouter, (path) => hasPrefix(path, "/v1/vendor") || hasPrefix(path, "/v1/admin"));

export default router;
