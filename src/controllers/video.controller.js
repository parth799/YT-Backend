import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";


const addVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Invalid title or description");
  }

  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "not found videoFileLocalpath");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "not found thumbnailLocalPath");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Error while uploading video");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }
  // console.log(">>>>>>>>>>>");

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: false,
  });
  // console.log("<<<<<<<<<<>>>>>>>>>>");

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(500, "Error while creating video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video uploaded successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is invalid");
  }
  if (!isValidObjectId(req.user?.id)) {
    throw new ApiError(400, "Invalid user id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers"
            }
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [
                      req.user?._id,
                      "$subscribers.subscriber"
                    ]
                  },
                  then: true,
                  else: false
                }
              }
            }
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1
            }
          }
        ],
      },
    }, {
      $addFields: {
        likeCount: { $size: "$likes" },
        owner: { $first: "$owner" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1
      }
    }
  ]);

  if (!video) {
    throw new ApiError(500, "faied to fetch video")
  }

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1
    }
  })

  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId
    }
  })
  return res.status(200).json(new ApiResponse(200, video[0], "video fetched successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is invalid");
  }

  if (!(title && description)) {
    throw new ApiError(400, "title is invalid");
  }

  const video = await Video.findById(videoId);
  if (!videoId) {
    throw new ApiError(400, "No video found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "you are not authorized to update this video");
  }

  const thumbnailToDelete = video.thumbnail.public_id;

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "you are not authorized to delete");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      }
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "faile to update video please try again");
  }
  if (updatedVideo) {
    await deleteOnCloudinary(thumbnailToDelete)
  }
  return res.status(200).json(new ApiResponse(200, updatedVideo, "video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is invalid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No video found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "you are not authorized to delete this video");
  }

  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted) {
    throw new ApiError(400, "faile to delete video please try again");
  }

  if (videoDeleted) {
    await deleteOnCloudinary(video.thumbnail.public_id)
    await deleteOnCloudinary(video.videoFile.public_id)
  }

  await Like.deleteMany({
    video: videoId
  })

  await Comment.deleteMany({
    video: videoId
  })

  return res.status(200).json(new ApiResponse(200, {}, "video deleted successfully!"))
})


const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if(!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video id")
  }

  const video = await Video.findById(videoId);

  if(video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "you are not authorized to publish this video")
  }

  const toggledVideoPubllish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished:!video?.isPublished
      }
    },
    { new: true }
  )

  if(!toggledVideoPubllish) {
    throw new ApiError(500, "failed to toggle publish status")
  }
 
  return res.status(200).json(new ApiResponse(200, {isPublished: toggledVideoPubllish.isPublished}, "video publish status toggled successfully!"))
})

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // console.log("---:", { page, limit, query, sortBy, sortType, userId });

  const pipeline = [];

  if (query) {
    // console.log("Adding search stage to pipeline for query:", query);
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"]
        }
      }
    });
  }

  if (userId) {
    console.log("Received userId:", userId);
    if (!mongoose.isValidObjectId(userId)) {
      console.error("Invalid userId:", userId);
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId)
      }
    });
  }

  // console.log("Adding match stage to pipeline for published videos");
  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
    // console.log("Adding sort stage to pipeline:", { sortBy, sortType });
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1
      }
    });
  } else {
    // console.log("Adding default sort stage to pipeline");
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // console.log("Adding lookup and unwind stages to pipeline");
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1
            }
          }
        ]
      }
    },
    {
      $unwind: "$ownerDetails"
    }
  );

  // console.log("Final aggregation pipeline:", JSON.stringify(pipeline, null, 2));

  const videoAggregate = Video.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };

  // console.log("Pagination options:", options);
  try {
    const video = await Video.aggregatePaginate(videoAggregate, options);
    console.log("Fetched videos:", video);
    return res.status(200).json(new ApiResponse(200, video, "Videos fetched successfully"));
  } catch (error) {
    console.error("Error during aggregation:", error);
    throw new ApiError(500, "Error fetching videos");
  }
});

export { getAllVideos, addVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus };
