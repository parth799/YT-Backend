import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";

const getAllvideo = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  console.log(userId);

  const pipeline = [];
  if (query) {
    pipeline.push({
      $search: {
        index: "search-video",
        text: {
          query: query,
          parth: ["title", "description"],
        },
      },
    });
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid UserId");
    }
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? "1" : "-1",
      },
    });
  }else{
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
        $lookup: {
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        username:1,
                        "avatar.url":1
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

  const options= {
    page:parseInt(page, 10),
    limit: parseInt(limit, 10)
  }
  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});
