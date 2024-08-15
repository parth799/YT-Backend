import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  console.log(userId);
  const pipeline = [];

  if (query) {
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
      if (!isValidObjectId(userId)) {
          throw new ApiError(400, "Invalid userId");
      }

      pipeline.push({
          $match: {
              owner: new mongoose.Types.ObjectId(userId)
          }
      });
  }

  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
      pipeline.push({
          $sort: {
              [sortBy]: sortType === "asc" ? 1 : -1
          }
      });
  } else {
      pipeline.push({ $sort: { createdAt: -1 } });
  }

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
                          "avatar.url": 1
                      }
                  }
              ]
          }
      },
      {
          $unwind: "$ownerDetails"
      }
  )

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
      .status(200)
      .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const punblishVideo = asyncHandler(async (req, res) => {
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
  console.log(">>>>>>>>>>>");

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
  console.log("<<<<<<<<<<>>>>>>>>>>");

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(500, "Error while creating video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video uploaded successfully!"));
});

export { getAllVideos, punblishVideo };
