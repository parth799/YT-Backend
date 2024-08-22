import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getCommentsByVideo, updateComment } from "../controllers/comment.controller.js";

const router = Router();
router.use(verifyJWT),

router.route("/:videoId").post(addComment).get(getCommentsByVideo)
router.route("/c/:commentId").patch(updateComment).delete(deleteComment)


export default router;