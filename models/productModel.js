import mongoose from "mongoose";
import Category from "./categoryModel.js";

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
  
    Category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    regularPrice: {
        type: Number,
        required: true
    },
   discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 
    },
    variants: [{
        colorName: {
            type: String,
            required: true,
            default: 'Black'
        },
        colorHex: {
            type: String,
            required: true,
            default: '#1a202c'
        },
        images: {
            type: [String],
            required: true,
            validate: [arrayMinSize, 'Each color variant must have at least one image']
        },
        sizes: [{
            size: {
                type: Number,
                required: true
            },
            stock: {
                type: Number,
                required: true,
                default: 0
            }
        }]
    }],
    totalQuantity: {
        type: Number,
        default: 0
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['In Stock', 'Out of Stock', 'Discontinued'],
        default: 'In Stock'
    },
    countryOfOrigin:{
        type: String,
        default: 'India',
        trim: true
    },
    material:{
        type: String,
        default: 'Leather',
        trim: true
    },
    closureType:{
        type: String,
        default: 'Lace Up',
        trim: true
    },
    soleType:{
        type: String,
        default: 'Rubber',
        trim: true
    },
    weight:{
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

function arrayMinSize(val) {
    return val.length > 0;
}

const Product = mongoose.model('Product', productSchema);
export default Product;