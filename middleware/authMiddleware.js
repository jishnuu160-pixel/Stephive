import User from '../models/userModel.js';

export const isUserAuthenticated = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const user = await User.findById(req.session.user.id);

            if (user && user.isBlocked) {
                delete req.session.user;
                if(req.session.passport) delete req.session.passport.user;

                return req.session.save(() => {
                    return res.redirect('/user/login?error=blocked');
                });
            }

            res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            return next();
        } catch (error) {
            console.error("Database check failed:", error);
            return next();
        }
    } else {
        return res.redirect('/user/login');
    }
};

export const isUserLoggedOut = (req, res, next) => {
    if (req.session && req.session.user) {
        const backURL = req.header('Referer') || '/'; 
        return res.redirect(backURL); 
    }
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
};


export const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); 
    res.setHeader('Pragma', 'no-cache'); 
    res.setHeader('Expires', '0'); 
    next();
};