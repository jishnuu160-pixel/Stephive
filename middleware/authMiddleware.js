import { HTTP_STATUS } from "../constants/httpStatusCode.js";
import User from "../models/userModel.js";
import Cart from "../models/cartModel.js";
import * as wishlistService from "../services/wishlistService.js";


/* ---------------- HELPER FUNCTIONS ---------------- */

const isApiRequest = (req) => {
    return (
        req.xhr ||
        req.headers.accept?.includes("json") ||
        req.headers["content-type"]?.includes("application/json")
    );
};


const clearUserSession = (req) => {
    delete req.session.user;

    if (req.session.passport) {
        delete req.session.user;
        delete req.session.passport;
    }
};


/* ---------------- USER AUTHENTICATION ---------------- */

export const isUserAuthenticated = async (req, res, next) => {
    if (!req.session?.user) {

        if (isApiRequest(req)) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: "Please login!"
            });
        }
        req.flash("error", "Please login first to continue");
        return res.redirect("/user/login");
    }

    try {
        const userId =req.session.user.id || req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {

            clearUserSession(req);

            return req.session.save(() => {
             if (err) console.error("Session save error:", err);
                if (isApiRequest(req)) {
                    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                        success: false,
                        message: "Please login!"
                    });
                }

                req.flash("error", "Please login first to continue");
                return res.redirect("/user/login");
            });
        }


        if (user.isBlocked) {

            clearUserSession(req);

            return req.session.save(() => {
                if (isApiRequest(req)) {
                    return res.status(HTTP_STATUS.FORBIDDEN).json({
                        success: false,
                        message: "Your account has been blocked by the administrator."
                    });
                }

               req.flash("error", "Your account has been blocked by admin.");
               return res.redirect("/user/login");
            });
        }

        req.user = user;

        res.setHeader( "Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        return next();

    } catch (error) {

        console.error("Database check failed:", error);

        if (isApiRequest(req)) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error during auth check"
            });
        }

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(
            "Internal server error"
        );
    }
};


/* ---------------- LOGGED OUT USER ---------------- */

export const isUserLoggedOut = (req, res, next) => {

    if (req.session?.user) {
        return res.redirect("/");
    }

    res.setHeader(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate"
    );

    return next();
};


/* ---------------- PREVENT CACHE ---------------- */

export const preventCache = (req, res, next) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return next();
};


/* ---------------- GLOBAL NAVBAR DATA ---------------- */

export const injectNavbarData = async (req, res, next) => {
    res.locals.user = null;
    res.locals.cartCount = 0;
    res.locals.globalWishlistCount = 0;

    if (req.path.startsWith('/admin')) {
        return next();
    }

    try {
        if (!req.session?.user) {
            return next();
        }

        const userId = req.session.user.id || req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            clearUserSession(req);
            return req.session.save(() => next());
        }

        if (user.isBlocked) {
            clearUserSession(req);
            return req.session.save(() => {
                if (err) console.error("Session save error:", err);
                if (isApiRequest(req)) {
                    return res.status(HTTP_STATUS.FORBIDDEN).json({
                        success: false,
                        message: "Your account has been blocked by the administrator."
                    });
                }
                req.flash("error", "Your account has been blocked by admin.");
                return res.redirect("/user/login");
            });
        }

        res.locals.user = req.session.user;

        const [cart, wishlistCount] = await Promise.all([
            Cart.findOne({ userId }),
            wishlistService.getWishlistCount(userId)
        ]);

        if (cart?.items?.length) {
            res.locals.cartCount = cart.items.reduce(
                (total, item) => total + item.quantity,
                0
            );
        }

        res.locals.globalWishlistCount = wishlistCount || 0;

        return next();

    } catch (error) {
        console.error("Error generating global navbar data:", error);
        res.locals.user = null; 
        res.locals.cartCount = 0;
        res.locals.globalWishlistCount = 0;
        return next();
    }
};


/* ---------------- GLOBAL WISHLIST COUNT ---------------- */

export const wishlistCountMiddleware = async (req, res, next) => {

    if (req.path.startsWith('/admin')) {
        res.locals.wishlistCount = 0;
        return next();
    }
    try {
        res.locals.wishlistCount = 0;

        if (!req.session?.user) {
            return next();
        }

        const userId = req.session.user.id || req.session.user._id;
        const count = await wishlistService.getWishlistCount(userId);

        res.locals.wishlistCount = count;

        return next();
    } catch (error) {
        res.locals.wishlistCount = 0;
        return next();
    }
};