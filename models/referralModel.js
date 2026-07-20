import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
    rewardAmount: { 
        type: Number, 
        required: true 
    },
    referrer_user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    referralCode: { 
        type: String, 
        required: true 
    },
    referred_user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    status: { 
        type: String, 
        enum: ['rewarded', 'pending', 'completed'], 
        default: 'pending' 
    },
    discountPercentage: { 
        type: Number 
    }
}, { timestamps: true });

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;