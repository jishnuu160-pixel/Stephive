
import cron from 'node-cron';
import Coupon from '../models/couponModel.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';

export const initExpiryCron = () => {
    cron.schedule('* * * * *', async () => {
        console.log(`[Cron] Expiry check started: ${new Date().toISOString()}`);

        try {
            const now = new Date();

            // Expire coupons
            const couponResult = await Coupon.updateMany(
                {
                    status: 'Active',
                    expiryDate: { $lt: now }
                },
                {
                    $set: {
                        status: 'Inactive'
                    }
                }
            );

            if (couponResult.modifiedCount > 0) {
                console.log(
                    `[Cron] Auto-expired ${couponResult.modifiedCount} coupon(s).`
                );
            }

            // Expire product offers
            const productResult = await Product.updateMany(
                {
                    'offer.isActive': true,
                    'offer.expiryDate': { $lt: now }
                },
                {
                    $set: {
                        'offer.$[elem].isActive': false,
                        'offer.$[elem].discountValue': 0,
                        'offer.$[elem].startDate': null,
                        'offer.$[elem].expiryDate': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'elem.isActive': true,
                            'elem.expiryDate': { $lt: now }
                        }
                    ]
                }
            );

            if (productResult.modifiedCount > 0) {
                console.log(
                    `[Cron] Auto-expired offers for ${productResult.modifiedCount} product(s).`
                );
            }

            // Expire category offers
            const categoryResult = await Category.updateMany(
                {
                    'offer.isActive': true,
                    'offer.expiryDate': { $lt: now }
                },
                {
                    $set: {
                        'offer.$[elem].isActive': false,
                        'offer.$[elem].discountValue': 0,
                        'offer.$[elem].startDate': null,
                        'offer.$[elem].expiryDate': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'elem.isActive': true,
                            'elem.expiryDate': { $lt: now }
                        }
                    ]
                }
            );

            if (categoryResult.modifiedCount > 0) {
                console.log(
                    `[Cron] Auto-expired offers for ${categoryResult.modifiedCount} categor(ies).`
                );
            }

        } catch (error) {
            console.error('[Cron Error] Failed to expire coupons/offers:', error);
        }
    });

    console.log('[Cron] Expiry cron initialized.');
};
