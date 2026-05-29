export const handleUploadError = (uploadMiddleware) => {

    return (req, res, next) => {

        uploadMiddleware(req, res, (err) => {

            if (err) {

                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            next();
        });
    };
};