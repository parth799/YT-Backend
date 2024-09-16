import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Tweet } from "../models/tweet.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudnary.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content cannot be empty");
    }
    const communityFile = req.files?.CommunityPostImage?.[0];

    if (!communityFile) {
        throw new ApiError(400, "CommunityPostImage is required!");
    }
    const CommunityPostImage = await uploadOnCloudinary(communityFile.path);

    if (!CommunityPostImage) {
        throw new ApiError(400, "Error while uploading image");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
        CommunityPostImage: {
            url: CommunityPostImage.url,
            public_id: CommunityPostImage.public_id,
        }
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet");
    }

    return res.status(201).json(new ApiResponse(201, tweet, "Community created successfully!"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Community id");
    }

    if (!content) {
        throw new ApiError(400, "Content cannot be empty");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Community not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not authorized to edit this Community");
    }

    let updatedCommunityPostImage = tweet.CommunityPostImage;
    console.log("req.file?.path", req.file?.path);

    if (req.file?.path) {
        const communityImage = await uploadOnCloudinary(req.file?.path);
        if (!communityImage) {
            throw new ApiError(400, "Error uploading image");
        }
        updatedCommunityPostImage = {
            url: communityImage.url,
            public_id: communityImage.public_id,
        };
        await deleteOnCloudinary(tweet.CommunityPostImage.public_id);
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
                CommunityPostImage: updatedCommunityPostImage,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updatedTweet) {
        throw new ApiError(404, "Failed to update Community");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Community updated successfully!"));
});


const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Community id");
    }
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Community not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "you are not authorized to delete this Community");
    }

    const tweetDelete = await Tweet.findByIdAndDelete(tweet._id);

    if (!tweetDelete) {
        throw new ApiError(404, "delete Community not found");
    }
    await deleteOnCloudinary(tweet.CommunityPostImage.public_id)
    return res.status(200).json(new ApiResponse(200, {}, "Community deleted successfully!"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1,
                "CommunityPostImage.url": 1,
            },
        },

    ])

    if (!tweets) {
        throw new ApiError(404, "Tweets not found for this user");
    }

    return res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched successfully!"));

});

export { createTweet, updateTweet, deleteTweet, getUserTweets } 