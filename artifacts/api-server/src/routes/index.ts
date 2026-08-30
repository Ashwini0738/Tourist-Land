import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(exploreRouter);
router.use(favoritesRouter);
router.use(hotelsRouter);
router.use(bookingsRouter);
router.use(notificationsRouter);
router.use(reviewsRouter);
router.use(onboardingRouter);
router.use(authRouter);
router.use(vendorPortalRouter);
router.use(adminRouter);
router.use(roleAccessRouter);

export default router;
