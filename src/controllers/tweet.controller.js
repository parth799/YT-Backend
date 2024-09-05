import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {Tweet} from "../models/tweet.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req,res) => {
    const {content} = req.body;

    if(!content){
        throw new ApiError(400, "Content cannot be empty");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if(!tweet){
        throw new ApiError(500, "Failed to create tweet");
    }

    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully!"));
})

const updateTweet = asyncHandler(async(req,res) => {
    const {tweetId} = req.params;
    const {content} = req.body;
    
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }

    if(!content){
        throw new ApiError(400, "Content cannot be empty");
    }
    
    const tweet = await Tweet.findByIdAndUpdate(tweetId, {content}, {new: true, runValidators: true});

    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully!"));
})


export { createTweet,updateTweet } 