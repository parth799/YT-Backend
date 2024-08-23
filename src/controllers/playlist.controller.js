import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose, { isValidObjectId } from "mongoose";


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        throw new ApiError(400, "name or description is required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist")
    }

    return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully!"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!name || !description) {
        throw new ApiError(400, "name or description is required");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can edit the playlist")
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatePlaylist, "Playlist updated successfully!"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }
    
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    if (playlist.owner.toString()!== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete the playlist")
    }

    await Playlist.findByIdAndDelete(playlist._id);

    return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted successfully!"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) ||!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);
    
    if (!playlist ||!video) {
        throw new ApiError(400, "Playlist or video not found");
    }

    if ((playlist.owner.toString() && video.owner.toString())!== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can add videos to the playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $addToSet: { videos: videoId }
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(400, "faile to add video to playlist")
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully!"))
})


export { createPlaylist, updatePlaylist, deletePlaylist, addVideoToPlaylist }
