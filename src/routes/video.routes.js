import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllVideos,
    punblishVideo,
} from "../controllers/video.controller.js"
const router = Router();

router
    .route("/")
    .get(getAllVideos)   
    .post(
            verifyJWT,
            upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            }
        ]),
        punblishVideo,
    );

export default router;