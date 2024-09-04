import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

import request from 'request';
import { ApiError } from './apiError.js';
// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        console.log("file is uploaded on cloudinary", response);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}

const deleteOnCloudinary = async (public_id, resource_type = "image") => {
    try {
        if (!public_id) return null;
        const result = await cloudinary.uploader.destroy(public_id, { resource_type: `${resource_type}` });
        console.log(">>>", result);
        return result
    } catch (error) {
        console.log("file deletion failed on cloudinary", error);
        return error;
    }
}

const uploadVideoOnVdoCipher = async (videoFilePath, title) => {
    if (!videoFilePath) return null;

console.log("videoFilePath",videoFilePath);
const titles = '2024-09-03 18-26-08.mkv'

try {
    const response = await axios.put(
        `https://dev.vdocipher.com/api/videos?title=${titles}`,
        {
            folderId : '4c3384d459cc41b08e9217be5cd8b524',
            // url: videoFilePath,
            // title: '2024-09-03 18-26-08.mkv',
        },
        {
            headers: {
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,

            },
        }
    );
    console.log("loggggg",  response);
    
    return response.data;
} catch (error) {
    throw new ApiError(
        error.response?.status || 500,
        `VdoCipher Import Error: ${error.response?.data?.message || error.message}`
    );
}
};



export { uploadOnCloudinary, deleteOnCloudinary,uploadVideoOnVdoCipher }
