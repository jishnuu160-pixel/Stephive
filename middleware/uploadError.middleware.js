import { HTTP_STATUS } from "../constants/httpStatusCode.js";

export const handleUploadError = (uploadMiddleware) => {
    return (req, res, next) => {
          uploadMiddleware(req, res, (err) => {
            if (err) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};