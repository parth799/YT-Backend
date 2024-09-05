import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {Tweet} from "../models/tweet.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { createTweet } 