import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The binary data of the image
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: 'stephive_assets', 
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] 
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed:", error);
                    return reject(new Error("Image upload failed"));
                }
                resolve(result.secure_url);
            }
        );
        uploadStream.end(fileBuffer);
    });
};