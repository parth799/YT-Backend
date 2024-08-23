import {Playlist} from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose,{isValidObjectId} from "mongoose";


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description}  = req.body;

    if(!name || !description) {
        throw new ApiError(400, "name or description is required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist) {
        throw new ApiError(500, "Failed to create playlist")
    }

    return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully!"))
})

export {createPlaylist}
