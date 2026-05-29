import Category from '../models/categoryModel.js';

export const findParentCategory = (nameRegex) => {
    return Category.findOne({ name: { $regex: nameRegex } }).lean();
};

export const findSubcategories = (parentId) => {
    return Category.find({
        $or: [
            { parentCategory: parentId },
            { parentId }
        ],
        isListed: true
    }).lean();
};