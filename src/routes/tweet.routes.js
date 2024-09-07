import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, deleteTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();


router.route("/").post(
    verifyJWT,
    upload.fields([
        {
            name: "CommunityPostImage",
            maxCount: 1,
        },
    ]),
    createTweet
);
router.route("/:tweetId").patch(verifyJWT, upload.single("CommunityPostImage"), updateTweet).delete(verifyJWT, deleteTweet);
router.route("/user/:userId").get(verifyJWT, getUserTweets)

export default router;