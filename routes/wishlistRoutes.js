import express from "express";
import { getWishlist, toggleWishlist, checkWishlistStatus } from "../controllers/wishlistController.js";
import { isUserAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", isUserAuthenticated, getWishlist);
router.get("/check", isUserAuthenticated, checkWishlistStatus); 
router.post("/toggle", isUserAuthenticated, toggleWishlist);

export default router;