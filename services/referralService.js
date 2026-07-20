import * as referralRepo from '../repositories/referralRepository.js';
import * as userRepo from '../repositories/userRepository.js';

export const getReferralDashboardData = async (userId) => {
    const user = await userRepo.findById(userId);
    const stats = await referralRepo.getReferralStats(userId);
    const history = await referralRepo.getReferralList(userId);

    return {
        referralCode: user.referralCode,
        stats: stats[0] || { totalReferrals: 0, successfulReferrals: 0, totalEarned: 0 },
        history: history
    };
};