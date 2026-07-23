import * as referralRepo from '../repositories/referralRepository.js';
import * as userRepo from '../repositories/userRepository.js';

export const getReferralDashboardData = async (userId) => {
    const user = await userRepo.findById(userId);
    
    if (!user) {
        throw new Error("User not found");
    }

    const statsResult = await referralRepo.getReferralStats(userId);
    const stats = statsResult[0] || { 
        totalReferrals: 0, 
        successfulReferrals: 0, 
        totalEarned: 0 
    };

    const history = await referralRepo.getReferralList(userId);

    return {
        user,
        referralCode: user.referralCode,
        stats,
        history
    };
};

