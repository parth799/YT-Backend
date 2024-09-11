import { Router } from "express";
import {
  changeCurrentPassword,
  clearWatchHistory,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  googleAuth,
  loginUser,
  logoutUser,
  paymentManager,
  refreshAccessToken,
  registerUser,
  stopeWatchHistory,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-user").patch(verifyJWT, updateAccountDetails);

router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-coverImg")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
router.route("/google").post(googleAuth);
router.route("/toggle/stophistory/:userId").patch(verifyJWT, stopeWatchHistory)
router.route("/clear-history").patch(verifyJWT, clearWatchHistory)
router.route("/payment").post(verifyJWT, paymentManager)
export default router;
