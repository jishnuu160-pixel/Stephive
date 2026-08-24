import * as referralService from '../services/referralService.js';
import { HTTP_STATUS } from '../constants/httpStatusCode.js';

export const getReferralPage = async (req, res) => {
    try {
        const userId = req.user.id; 
        const data = await referralService.getReferralDashboardData(userId);
        
        res.render('user/refer-earn', { 
            user: data.user, 
            layout: 'main', 
            totalReferrals: data.stats.totalReferrals,
            successfulReferrals: data.stats.successfulReferrals,
            rewardsEarned: data.stats.totalEarned,
            history: data.history,
            activePage:'referral',
            referralCode: data.referralCode
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error loading referral page");
    }
};

export const getAllReferralHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await referralService.getFullReferralHistoryData(userId);

        res.render('user/referral-history-full', {
            user: data.user,
            layout: 'main',
            history: data.history,
            activePage: 'referral'
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error loading referral history");
    }
};