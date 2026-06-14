import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import datasetsRouter from "./datasets";
import variablesRouter from "./variables";
import statsRouter from "./stats";
import authRouter from "./auth";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(datasetsRouter);
router.use(variablesRouter);
router.use(statsRouter);
router.use(exportRouter);

export default router;
