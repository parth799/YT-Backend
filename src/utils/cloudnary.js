import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

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

const uploadVideoOnVdoCipher = async (videoFilePath) => {
    if (!videoFilePath) return null;

    try {
        console.log("videoFilePath", videoFilePath);
        const uploadRequestResponse = await axios.post(
            'https://dev.vdocipher.com/api/videos',
            {}, // Ensure the payload is correct as per VdoCipher API documentation
            {
                headers: {
                    Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`
                }
            }
        );

        const { uploadLink, videoId } = uploadRequestResponse.data;
        const videoFile = fs.createReadStream(videoFilePath);

        const uploadResponse = await axios.put(uploadLink, videoFile, {
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        });

        console.log("Video uploaded successfully", uploadResponse.data);
        return uploadResponse.data;
    } catch (error) {
        console.log("Video upload failed on VdoCipher", error);
        return error;
    }
};

export { uploadOnCloudinary, deleteOnCloudinary,uploadVideoOnVdoCipher }
