import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import Stripe from "stripe";


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // return res
  // .status(201)
  // .json({messge:"hiiiii"});

  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all filds are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists!");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatarfils is reqired!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath).catch((error) => console.log(error))
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }
  const user = await User.create({
    fullName,
    avatar: {
      public_id: avatar.public_id,
      url: avatar.secure_url
    },
    coverImage: {
      public_id: coverImage?.public_id || "",
      url: coverImage?.secure_url || ""
    },
    email,
    password,
    username: username.toLowerCase(),
    joinUsers: null
  });
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createUser) {
    throw new ApiError(500, "Something wet wrong whhile registerng the user!");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createUser, "User Registerd Seccesfuly"));
});

const googleAuth = asyncHandler(async (req, res) => {
  const { email, username, fullName, avatar, password } = req.body
  if (!email) {
    throw new ApiError(500, "value is emty!")
  }

  const user = await User.create({
    fullName: fullName,
    avatar: {
      url: avatar
    },
    coverImage: {
      public_id: "hlllpu6l8tlggcbjea80" || "",
      url: "https://res.cloudinary.com/duhezhev3/image/upload/v1725515059/hlllpu6l8tlggcbjea80.png" || ""
    },
    email: email,
    password: password,
    username: username,
    joinUsers: null
  });

  const users = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!users) {
    throw new ApiError(405, "User not found")
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
    users._id
  );

  const loggedInUser = await User.findById(users._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiError(500, "Something wet wrong whhile registerng the user!");
  }
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
      user: loggedInUser,
      accessToken,
      refreshToken,
    }, "User Registerd Seccesfuly"));
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user dose not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const user = await User.findOne({
    refreshToken: incomingRefreshToken
  });

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken
        },
        "Access token refreshed"
      )
    )
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Name and email are required");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findById(req.user._id).select("avatar");

  const avatarToDelete = user.avatar.public_id;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: {
          public_id: avatar.public_id,
          url: avatar.secure_url
        }
      }
    },
    { new: true }
  ).select("-password");

  if (avatarToDelete && updatedUser.avatar.public_id) {
    await deleteOnCloudinary(avatarToDelete);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar update successfull")
    )
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage");
  }

  const user = await User.findById(req.user._id).select("coverImage");

  const coverImageToDelete = user.coverImage.public_id;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: {
          public_id: coverImage.public_id,
          url: coverImage.secure_url
        }
      }
    },
    { new: true }
  ).select("-password");

  if (coverImageToDelete && updatedUser.coverImage.public_id) {
    await deleteOnCloudinary(coverImageToDelete);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "coverImage update successfull")
    )
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subcribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subcribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        joinUsers: 1
      }
    }
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user.length) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

const stopeWatchHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  const stopeHistory = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        stopeWatchHistory: !user?.stopeWatchHistory
      }
    },
    { new: true }
  )

  if (!stopeHistory) {
    throw new ApiError(500, "failed to stope watch history")
  }

  return res.status(200).json(new ApiResponse(200, { stopeWatchHistory: stopeHistory.stopeWatchHistory }, "watch History stope successfully!"))
})

const clearWatchHistory = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        watchHistory: []
      }
    },
    { new: true }
  )
  if (!user) {
    throw new ApiError(500, "failed to clear watch history")
  }
  return res.status(200).json(new ApiResponse(200, user, "watch History cleared successfully!"))
})

const paymentManager = asyncHandler(async (req, res) => {
  const { username, channelId } = req.body;

  if (!username || !channelId) {
    throw new ApiError(400, "Username or channelId is missing");
  }
  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const stripe = Stripe(process.env.STRIPE_KEY);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price: 'price_1PtT1cDcxgPqDrQhXXvtcD3C',
      quantity: 1,
    }],
    mode: "payment",
    success_url: `http://localhost:5173/channel/${username}`,
    cancel_url: `http://localhost:5173/channel/${username}`,
  });

  if (!session) {
    throw new ApiError(500, "Failed to create payment session");
  }

  const loginUserId = req.user._id;

  if (channelId.toString() !== loginUserId.toString()) {
    await User.findByIdAndUpdate(
      channelId,
      { $addToSet: { joinUsers: loginUserId } });
  } else {
    return res.status(400).json({ message: "You cannot join your own channel" });
  }

  res.status(200).json({ id: session.id, message: "Payment session created successfully" });
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  googleAuth,
  stopeWatchHistory,
  clearWatchHistory,
  paymentManager
};
