import { Router, type IRouter } from "express";
import healthRouter from "./health";
import postbackRouter from "./postback";
import earnRouter from "./earn";

const router: IRouter = Router();

router.use(healthRouter);
router.use(postbackRouter);
router.use(earnRouter);

export default router;
