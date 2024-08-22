import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addComment = asyncHandler(async(req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }

    const video = await Video.findById(videoId);
    
    if (!isValidObjectId(video)) {
        throw new ApiError(400, "Invalid video id");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        commentedBy: req.user._id,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    return res.status(201).json(new ApiResponse(201, comment, "comment added successfully!"));
})



export {addComment}