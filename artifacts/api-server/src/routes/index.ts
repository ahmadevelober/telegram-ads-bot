import { Router, type IRouter } from "express";
import healthRouter from "./health";
import postbackRouter from "./postback";
import earnRouter from "./earn";
import miniappRouter from "./miniapp";
import webappRouter from "./webapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(postbackRouter);
router.use(earnRouter);
router.use(miniappRouter);
router.use(webappRouter);

export default router;
