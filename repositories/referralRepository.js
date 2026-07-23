import mongoose from 'mongoose';
import Referral from '../models/referralModel.js';

export const getReferralStats = async (referrer_user_id) => {
    return await Referral.aggregate([
        { $match: { referrer_user_id: new mongoose.Types.ObjectId(referrer_user_id) } },
        {
            $group: {
                _id: null,
                totalReferrals: { $sum: 1 },
                successfulReferrals: { 
                    $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
                },
                totalEarned: { 
                    $sum: { 
                        $cond: [
                            { $in: ["$status", ["completed", "rewarded"]] }, 
                            "$rewardAmount", 
                            0
                        ] 
                    } 
                }
            }
        }
    ]);
};

export const getReferralList = async (referrer_user_id) => {
    return await Referral.find({ referrer_user_id })
        .populate('referred_user_id', 'fullName email') 
        .sort({ createdAt: -1 })
        .limit(5);
};

