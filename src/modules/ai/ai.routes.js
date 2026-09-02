import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import ChatDto from "./dto/Chat.dto.js";
import * as aiController from "./ai.controller.js";

const router = Router();

router.use(authenticate);

router.post("/chat", validate(ChatDto), aiController.chat);

export default router;
