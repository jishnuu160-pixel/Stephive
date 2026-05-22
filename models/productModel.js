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
    Category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: false
    },
    productImage: {
        type: [String],
        required: true
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
        type:String,
        default:'India',
        trim:true
    },
    material:{
        type:String,
        default:'Leather',
        trim:true
    },
    closureType:{
        type:String,
        default:'Lace Up',
        trim:true
    },
    soleType:{
        type:String,
        default:'Rubber',
        trim:true
    },
    weight:{
        type:String,
        default:'',
        trim:true
    }
}, { timestamps: true });



const Product = mongoose.model('Product', productSchema);
export default Product;