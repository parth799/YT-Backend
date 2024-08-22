import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, updateComment } from "../controllers/comment.controller.js";

const router = Router();
router.use(verifyJWT),

router.route("/:videoId").post(addComment)
router.route("/c/:commentId").patch(updateComment)

export default router;