import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { toggleVideoLike,getLikedVideos, toggleCommentLike } from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoLike)
router.route("/videos").get(getLikedVideos);
router.route("/toggle/c/:commentId").post(toggleCommentLike)

export default router;