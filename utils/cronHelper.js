import cron from 'node-cron';
import Coupon from '../models/couponModel.js';
import Product  from '../models/productModel.js';
import Category  from '../models/categoryModel.js'; 


export const initCouponExpiryCron = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            const result = await Coupon.updateMany(
                { 
                    status: 'Active', 
                    expiryDate: { $lt: now } 
                },
                { 
                    $set: { status: 'Inactive' } 
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`[Cron] Auto-expired ${result.modifiedCount} coupon(s).`);
            }
        } catch (error) {
            console.error("[Cron Error] Failed to expire coupons:", error);
        }
    });
};


export const initOfferExpiryCron = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            const productResult = await Product.updateMany(
                { 
                    "offer.isActive": true, 
                    "offer.expiryDate": { $lt: now } 
                },
                { 
                    $set: { 
                        "offer.isActive": false, 
                        "offer.discountValue": 0,
                        "offer.startDate": null,
                        "offer.expiryDate": null
                    } 
                }
            );

            if (productResult.modifiedCount > 0) {
                console.log(`[Cron] Auto-expired product offers for ${productResult.modifiedCount} product(s).`);
            }

            const categoryResult = await Category.updateMany(
                { 
                    "offer.isActive": true, 
                    "offer.expiryDate": { $lt: now } 
                },
                { 
                    $set: { 
                        "offer.isActive": false, 
                        "offer.discountValue": 0,
                        "offer.startDate": null,
                        "offer.expiryDate": null
                    } 
                }
            );

            if (categoryResult.modifiedCount > 0) {
                console.log(`[Cron] Auto-expired category offers for ${categoryResult.modifiedCount} category(ies).`);
            }

        } catch (error) {
            console.error("[Cron Error] Failed to expire offers:", error);
        }
    });
};