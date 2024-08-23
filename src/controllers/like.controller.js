import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready._id);
        return res.status(200).json(new ApiResponse(200, { likedBy: false }, "Disliked successfully"));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res.status(200).json(new ApiResponse(200, { likedBy: true }, "Liked successfully"));
})

const getLikedVideos = asyncHandler(async(req, res) => {
    const likedVideosAgg = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ]
            },
        },
        {
            $unwind:"$likedVideo"
        },
        {
            $sort:{
                createdAt: -1,
            },
        },
        {
            $project:{
                _id: 0,
                likedVideo:{
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished:1,
                    ownerDetails:{
                        username: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }
            }
        }
    ]);
    return res.status(200).json(new ApiResponse(200, likedVideosAgg,"liked videos fetched successfully!f"));
})

const toggleCommentLike= asyncHandler(async(req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is invalid");
    }

    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready._id);
        return res.status(200).json(new ApiResponse(200, { likedBy: false }, "Disliked successfully"));
    }
    
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    })

    return res.status(200).json(new ApiResponse(200, { likedBy: true }, "Liked successfully"));
})

export { toggleVideoLike ,getLikedVideos, toggleCommentLike}