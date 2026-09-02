import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: false,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', 
        default: null 
    },

    offer: [{
        discountValue: { 
            type: Number, 
            default: 0,
            min: 0,
            max: 99
        },
        isActive: { 
            type: Boolean, 
            default: false 
        },
        offerType: { 
            type: String, 
            default: 'Percentage' 
        },
        startDate: { 
            type: Date, 
            default: null 
        },
        expiryDate: { 
            type: Date, 
            default: null 
        }
    }],
    isListed: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

const Category = mongoose.model('Category', categorySchema,'Categories');
export default Category;