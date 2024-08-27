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

const deleteComment = asyncHandler(async(req, res) => {
    const {commentId} = req.params;

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
        throw new ApiError(400, "Comment not found");
    }

    if (comment?.owner.toString()!== req.user?._id.toString()) {
        throw new ApiError(400, "You are not authorized to delete this comment!");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    })

    return res.status(200).json(new ApiResponse(200, {commentId}, "comment deleted successfully!"));
})

const getCommentsByVideo = asyncHandler(async(req, res) => {
    const { videoId } = req.params;
    const {page = 1 , limit = 10} = req.body;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const commentsAgg = Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
            $addFields:{
                likesCounnt:{
                    $size: "$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isLiked:{
                    $cond:{
                        if:{$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort:{
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCounnt:1,
                owner: {
                    _id: 1,
                    username: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate(commentsAgg, options);

    return res.status(200).json(new ApiResponse(200, comments, "comments retrieved successfully!"));
})

export {addComment, updateComment, deleteComment, getCommentsByVideo}