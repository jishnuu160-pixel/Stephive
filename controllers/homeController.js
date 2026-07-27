import * as productService from '../services/productService.js';
import * as wishlistService from '../services/wishlistService.js';

export const getHome = async (req, res) => {
    try {
        const latestSellersRaw = await productService.getLatestSellers();
        const bestSellersRaw = await productService.getBestSellers();

        const userId = req.session?.user?.id;
        let wishlistedProductIds = new Set();

        if (userId) {
            const wishlist = await wishlistService.getWishlist(userId);
            if (wishlist && wishlist.items) {
                wishlist.items.forEach(item => {
                    const id = item.productId?._id || item.productId;
                    if (id) wishlistedProductIds.add(id.toString());
                });
            }
        }

        const attachOfferPricing = (product) => {
            let discount = 0;
            
            if (product.offer && product.offer.isActive) {
                discount = product.offer.discountValue;
            } else if (product.Category && product.Category.offer && product.Category.offer.isActive) {
                discount = product.Category.offer.discountValue;
            }

            const hasOffer = discount > 0;
            const salePrice = hasOffer 
                ? Math.round(product.regularPrice * (1 - discount / 100)) 
                : product.regularPrice;

            return {
                ...product,
                isWishlisted: wishlistedProductIds.has(product._id.toString()),
                hasOffer,
                salePrice,
                regularPrice: product.regularPrice
            };
        };

        const latestSellers = latestSellersRaw.map(attachOfferPricing);
        const bestSellers = bestSellersRaw.map(attachOfferPricing); 

        return res.render('home', {
            isHome: true,
            activePage: 'home',
            user: req.session.user || null,
            latestSellers,
            bestSellers
        });

    } catch (error) {
        console.error("Home page error:", error);
        return res.status(500).render('error', { 
            message: "We encountered an issue loading the home page. Please try again later." 
        });
    }
};