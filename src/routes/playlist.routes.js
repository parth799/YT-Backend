import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"; 
import { createPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createPlaylist);
router.route("/:playlistId").patch(updatePlaylist)

export default router