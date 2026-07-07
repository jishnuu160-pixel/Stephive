import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }
    }]
});

export default mongoose.model('Wishlist', wishlistSchema);