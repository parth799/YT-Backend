import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import {Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $group:{
                _id: null,
                subscribersCount: { $sum: 1 }
            }
        }
    ])

    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project:{
                totalLikes:{
                    $size: "$likes"
                },
                totalViews:"$views",
                totalVideos: 1
            }
        },
        {
            $group:{
                _id: null,
                totalVideos: { $sum: 1 },
                totalLikes: { $sum: "$totalLikes" },
                totalViews: { $sum: "$totalViews" }
            }
        }
    ])

    const channelStatus = {
        totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0
    }

    return res.status(200).json(new ApiResponse(200, channelStatus, "Channel stats fetched successfully"));
})

export {
    getChannelStats
}