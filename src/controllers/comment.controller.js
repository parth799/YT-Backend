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
        owner: req.user._id,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    return res.status(201).json(new ApiResponse(201, comment, "comment added successfully!"));
})

const updateComment = asyncHandler(async(req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }
    const comment = await Comment.findById(commentId);
    // console.log(comment);
    
    if (!comment) {
        throw new ApiError(400, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not authorized to update this comment!");
    }
    // console.log(">>>>>>>>>>>>");

    const updatedComment = await Comment.findOneAndUpdate(
        comment._id,
        {
            $set:{
                content
            }
        },
        {new: true}
    )
    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment");
    }

    return res.status(200).json(new ApiResponse(200, updatedComment, "comment updated successfully!"));
})

export {addComment, updateComment}