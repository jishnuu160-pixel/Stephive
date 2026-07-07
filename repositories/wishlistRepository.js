import Wishlist from "../models/wishlistModel.js";

export const findByUserId = async (userId) => {
    return await Wishlist.findOne({ user_id: userId })
        .populate("items.productId")
        .lean();
};

export const createWishlist = async (userId) => {
    return await Wishlist.create({
        user_id: userId,
        items: []
    });
};

export const toggleWishlist=async(userId,productId)=>{

    let wishlist=await Wishlist.findOne({user_id:userId});

    if(!wishlist){

        wishlist=new Wishlist({

            user_id:userId,

            items:[{productId}]

        });

        await wishlist.save();

        return;

    }

    const index=wishlist.items.findIndex(item=>

        item.productId.toString()===productId

    );

    if(index>-1){

        wishlist.items.splice(index,1);

    }else{

        wishlist.items.push({productId});

    }

    await wishlist.save();

};

export const isInWishlist = async (userId, productId) => {
    const wishlist = await Wishlist.findOne({
        user_id: userId,
        "items.productId": productId
    });

    return !!wishlist;
};

export const findWishlistCount= async(userId)=>{
    const wishlist= await Wishlist.findOne({user_id:userId});

    return wishlist? wishlist.items.length:0;
}


export const removeFromWishlist = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { userId: userId },
        { $pull: { items: { productId: productId } } },
        { new: true } 
    );
};