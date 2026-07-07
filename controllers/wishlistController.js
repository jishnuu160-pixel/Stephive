import * as wishlistService from "../services/wishlistService.js";

export const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const wishlist = await wishlistService.getWishlist(userId);
       
        res.render("user/wishlist", {
            wishlist,
            activePage: "wishlist"
        });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId } = req.body;

        await wishlistService.toggleWishlist(userId, productId);
        
        const newCount = await wishlistService.getWishlistCount(userId);
        
        res.json({
            success: true,
            newCount: newCount 
        });
    } catch (err) {
        console.error("Error toggling wishlist:", err);
        res.status(500).json({
            success: false,
            message: "Failed to update wishlist"
        });
    }
};

export const getWishlistCount= async(req,res)=>{
    try{
        const userId= req.session.user.id;
        const count=await wishlistService.getWishlistCount(userId);
       
        return res.json({
            success:true,
            count
        })
    }catch{
        res.status(500).json({
            success:false
        })
    }
}