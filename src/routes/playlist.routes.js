import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"; 
import { createPlaylist, deletePlaylist, updatePlaylist, addVideoToPlaylist } from "../controllers/playlist.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createPlaylist);
router.route("/:playlistId").patch(updatePlaylist).delete(deletePlaylist)
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)

export default router