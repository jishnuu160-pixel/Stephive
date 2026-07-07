import express from "express";

import { getWishlist,toggleWishlist } from "../controllers/wishlistController.js";

import { isUserAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", isUserAuthenticated, getWishlist);

router.post("/toggle", isUserAuthenticated, toggleWishlist);

export default router;