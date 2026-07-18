import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true 
    },
    balance: { 
        type: Number, 
        default: 0,
        min: [0, 'Balance cannot be negative'] 
    },
    transactions: [{
        orderId: { type: String, ref: 'Order' },
        amount: { type: Number, required: true },
        type: { 
            type: String, 
            enum: ['credit', 'debit'], 
            required: true 
        },
        description: { type: String },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

export default Wallet;