import User from '../models/userModel.js';
import Cart from '../models/cartModel.js'; 


export const isUserAuthenticated = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const user = await User.findById(req.session.user.id);

            if (user && user.isBlocked) {
                delete req.session.user;
                if (req.session.passport) delete req.session.passport.user;

                return req.session.save(() => {
                    const isApiRequest =
                        req.xhr ||
                        req.headers.accept?.includes("json") ||
                        req.headers["content-type"]?.includes("application/json");

                    if (isApiRequest) {
                        return res.status(403).json({
                            success: false,
                            message: "User blocked"
                        });
                    }

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

        const isApiRequest =
            req.xhr ||
            req.headers.accept?.includes("json") ||
            req.headers["content-type"]?.includes("application/json");

        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: "Please login!"
            });
        }

        req.flash("error", "Please login first to continue");
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


/* ---------------- GLOBAL NAVBAR DATA MIDDLEWARE ---------------- */
export const injectNavbarData = async (req, res, next) => {
    try {
        res.locals.user = req.session.user || null;
        res.locals.cartCount = 0;

        if (req.session.user) {
            const cart = await Cart.findOne({ userId: req.session.user._id || req.session.user.id });
            if (cart && cart.items && cart.items.length > 0) {
                res.locals.cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);
            }
        }
        next();
    } catch (error) {
        console.error("Error generating global navbar data:", error);
        next();
    }
};