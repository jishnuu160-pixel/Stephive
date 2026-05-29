import {
    findProducts,
    countProducts,
    findProductById,
    findRelatedProducts,
    distinctBrands,
    distinctMaterials
} from '../repositories/productRepository.js';

import {
    findParentCategory,
    findSubcategories
} from '../repositories/categoryRepository.js';

import mongoose from 'mongoose';

/* ---------------- SHOP PAGE ---------------- */

export const getShopProducts = async (req) => {
    const { category, brand, price, sort, page = 1 ,search} = req.query;
  
   let query = {};


if (category && mongoose.Types.ObjectId.isValid(category)) {
    query.Category = category;
}

if (brand) {
    query.brand = new RegExp(`^${brand}$`, 'i');
}

if (search && search.trim() !== "") {
    query.$or = [
        {
            productName: {
                $regex: search.trim(),
                $options: 'i'
            }
        },
        {
            brand: {
                $regex: search.trim(),
                $options: 'i'
            }
        },
        {
            description: {
                $regex: search.trim(),
                $options: 'i'
            }
        }
    ];
}


    if (price && price !== 'all') {
        if (price === 'under5k') query.regularPrice = { $lt: 5000 };
        if (price === '5k-10k') query.regularPrice = { $gte: 5000, $lte: 10000 };
        if (price === 'above10k') query.regularPrice = { $gt: 10000 };
    }

    const limit = 10;

    const products = await findProducts(
        query,
        getSort(sort),
        (page - 1) * limit,
        limit
    );

   
    const totalProducts = await countProducts(query);

    return {
        products,

        activeCategory: category || null,
        activeBrand: brand || null,
        activePrice: price || "all",
        activeSort: sort || "",
        activeMaterial: sort || null,
        searchValue: search || null,

        currentPage: Number(page),
        totalPages: Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        prevPage: Number(page) - 1,
        nextPage: Number(page) + 1
    };
};
/* ---------------- WOMEN / MEN PAGE ---------------- */

const buildGenderQuery = (subIds, filters) => {
    let query = {
        $or: [
            { Category: { $in: subIds } },
            { category: { $in: subIds } }
        ],
        isListed: true
    };

    const { category, price, brand, material,search } = filters;

    if (brand) query.brand = new RegExp(`^${brand}$`, 'i');
    if (material) query.material = new RegExp(`^${material}$`, 'i');

    if (search) {
    query.productName = { $regex: search, $options: 'i'
    };
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
    query.Category = category;
    }    

    if (price && price !== 'all') {
        if (price === 'under5k') query.regularPrice = { $lt: 5000 };
        if (price === '5k-10k') query.regularPrice = { $gte: 5000, $lte: 10000 };
        if (price === 'above10k') query.regularPrice = { $gt: 10000 };
    }

    return query;
};

export const getGenderPage = async (gender, req) => {
    const { category, price, sort, material, brand, page = 1 ,search} = req.query;
    const limit = 6;

    const parentCategory = await findParentCategory(new RegExp(`^${gender}`, 'i'));

    let subcategories = [];
    let subIds = [];

    if (parentCategory) {
        subcategories = await findSubcategories(parentCategory._id);
        subIds = subcategories.map(c => c._id);
    }

    const query = buildGenderQuery(subIds, {
        category,
        price,
        brand,
        material,
        search
    });

    const sortQuery = getSort(sort);

    const totalProducts = await countProducts(query);

    const products = await findProducts(
        query,
        sortQuery,
        (page - 1) * limit,
        limit
    );

    const brands = await distinctBrands({
    isListed: true
    });
    const materials = await distinctMaterials({
    isListed: true
    });

    return {
    products,
    subcategories,
    brands,
    materials,

    genderTitle: gender,

    currentPage: Number(page),
    totalPages: Math.ceil(totalProducts / limit),

    hasPrevPage: page > 1,
    hasNextPage: page < Math.ceil(totalProducts / limit),

    prevPage: Number(page) - 1,
    nextPage: Number(page) + 1,

    activeCategory: category || null,
    activePrice: price || "all",
    activeSort: sort || null,
    activeMaterial: material || null,
    activeBrand: brand || null
}
};

const getSort = (sort) => {
    if (sort === 'low-high') return { regularPrice: 1 };
    if (sort === 'high-low') return { regularPrice: -1 };
    if (sort === 'popularity') return { salesCount: -1 };
    if (sort === 'a-z') return { productName: 1 };
    if (sort === 'z-a') return { productName: -1 };
    return { createdAt: -1 };
};

/* ---------------- PRODUCT DETAIL ---------------- */

export const getProductDetails = async (id) => {
    const product = await findProductById(id);

    if (!product) return null;

    const relatedProducts = await findRelatedProducts(product);

    return {
        product,
        relatedProducts
    };
};