import Brand from '../models/brandModel.js';
import Product from '../models/productModel.js'; 

export const countBrands = async (filter) => {
    return await Brand.countDocuments(filter);
};

export const findBrands = async (filter, skip, limit) => {
    return await Brand.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); 
};

export const findBrandById = async (id) => {
    return await Brand.findById(id); 
};

export const findUniqueProductBrands = async () => {
    return await Product.distinct('brand');
};

export const countProductsForBrand = async (brandName) => {
    return await Product.countDocuments({
        brand: { $regex: `^${brandName}$`, $options: 'i' }
    });
};

export const countListedProductsForBrand = async (brandName) => {
    return await Product.countDocuments({
        brand: { $regex: `^${brandName}$`, $options: 'i' },
        isListed: true 
    });
};

export const ensureBrandExists = async (brandName) => {
    const existing = await Brand.findOne({ name: { $regex: `^${brandName}$`, $options: 'i' } });
    
    if (!existing) {
        await Brand.create({
            name: brandName,
            description: `Auto-detected from existing product listings.`,
            logo: "default-logo.png", 
            isListed: true
        });
    }
};

export const updateProductsStatusByBrand = async (brandName, isListedStatus) => {
    return await Product.updateMany(
        { brand: { $regex: `^${brandName}$`, $options: 'i' } },
        { $set: { isListed: isListedStatus } }
    );
};