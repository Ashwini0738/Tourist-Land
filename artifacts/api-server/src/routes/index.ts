import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import authRouter from "./auth";
import roleAccessRouter from "./role-access";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(onboardingRouter);
router.use(authRouter);
router.use(roleAccessRouter);

export default router;
