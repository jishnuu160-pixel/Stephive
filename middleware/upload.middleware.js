import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadPath = path.join(process.cwd(), 'public/uploads/profile_pics');

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];

    const allowedExtensions = /\.(jpeg|jpg|png|webp)$/i;

    const isMimeValid = allowedMimeTypes.includes(file.mimetype);

    const isExtValid = allowedExtensions.test(file.originalname);

    if (isMimeValid && isExtValid) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

export const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024
    }
});