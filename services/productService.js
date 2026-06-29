import * as productRepo from '../repositories/productRepository.js';
import * as brandRepo from '../repositories/brandRepository.js';
import {
    findParentCategory,
    findAllCategories,
    findParentCategories,
    findSubCategoriesByParent
} from '../repositories/categoryRepository.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js'; 

/**
 * @param {Buffer} fileBuffer 
 * @returns {Promise<string>} 
 */
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: 'stephive_products',
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] 
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed:", error);
                    return reject(new Error("Image upload transformation failed"));
                }
                resolve(result.secure_url); 
            }
        );
        uploadStream.end(fileBuffer);
    });
};

/**
 * 
 * 
 * @param {Object} file 
 */
const validateUploadedFile = (file) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = /(\.jpg|\.jpeg|\.png|\.webp)$/i;
    const maxSizeBytes = 2 * 1024 * 1024; 

  
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.exec(file.originalname)) {
        throw new Error(`Security Alert: "${file.originalname}" is not an accepted image format (JPG, PNG, WebP only).`);
    }

    if (file.size > maxSizeBytes) {
        throw new Error(`Validation Error: "${file.originalname}" exceeds the maximum allowed size of 2MB.`);
    }
};

/* ---------------- SHOP PAGE ---------------- */

export const getShopProducts = async (req) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const allCategories = await findAllCategories();
        const activeCategoryObjectIds = allCategories
            .filter(cat => !cat.isUnlisted)
            .map(cat => new mongoose.Types.ObjectId(cat._id));

        let searchFilter = { 
            isListed: true,
            Category: { $in: activeCategoryObjectIds } 
        };

        if (req.query.gender) {
            searchFilter.gender = req.query.gender;
        }

        if (req.query.search?.trim()) {
            searchFilter.productName = { $regex: req.query.search.trim(), $options: 'i' };
        }

        if (req.query.category) {
            const catIds = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
            const validIds = catIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            
            const authorizedIds = validIds.filter(id => 
                activeCategoryObjectIds.some(activeId => activeId.equals(id))
            );
            if (authorizedIds.length > 0) searchFilter.Category = { $in: authorizedIds };
        }

        if (req.query.brand) {
            const brandIds = Array.isArray(req.query.brand) ? req.query.brand : [req.query.brand];
            searchFilter.brand = { $in: brandIds };
        }

        const [products, totalProducts, rawBrands] = await Promise.all([
            productRepo.findProducts(searchFilter, { createdAt: -1 }, skip, limit),
            productRepo.countProducts(searchFilter),
            productRepo.distinctBrands()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        return {
            products,
            currentPage: page,
            totalPages: totalPages || 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchValue: req.query.search || "",
            categories: allCategories.filter(cat => !cat.isUnlisted).map(cat => ({
                ...cat,
                isSelected: req.query.category ? (Array.isArray(req.query.category) ? req.query.category.includes(cat._id.toString()) : req.query.category === cat._id.toString()) : false
            })),
            brands: rawBrands.map(b => ({
                name: b,
                isSelected: req.query.brand ? (Array.isArray(req.query.brand) ? req.query.brand.includes(b) : req.query.brand === b) : false
            }))
        };
    } catch (error) {
        console.error("Error inside getShopProducts:", error);
        throw error;
    }
};

export const getBestSellers = async () => {
    try {
        return await productRepo.findProducts({ isListed: true }, { createdAt: -1 }, 0, 4);
    } catch (error) {
        console.error("Error fetching best sellers:", error);
        return [];
    }
};

/* ---------------- GENDER COMPILATION PAGES ---------------- */

const buildGenderQuery = (subIds, filters) => {
    const authorizedObjectIds = (subIds || []).map(id => new mongoose.Types.ObjectId(id));

    let query = { 
        isListed: true,
        Category: { $in: authorizedObjectIds } 
    };

    const { category, price, brand, material, search } = filters;

    if (brand) query.brand = new RegExp(`^${brand}$`, 'i');
    if (material) query.material = new RegExp(`^${material}$`, 'i');

    if (search && search.trim() !== '') {
        query.productName = { $regex: search.trim(), $options: 'i' };
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
        const selectedId = new mongoose.Types.ObjectId(category);
        const isAuthorized = authorizedObjectIds.some(activeId => activeId.equals(selectedId));
        
        if (isAuthorized) {
            query.Category = selectedId;
        } else {
            query.Category = null; 
        }
    }

    if (price && price !== 'all') {
        if (price === 'under5k') query.regularPrice = { $lt: 5000 };
        if (price === '5k-10k') query.regularPrice = { $gte: 5000, $lte: 10000 };
        if (price === 'above10k') query.regularPrice = { $gt: 10000 };
    }

    return query;
};

export const getGenderPage = async (gender, req) => {
    const { category, price, sort, material, brand, page = 1, search } = req.query;
    const limit = 6;

    const oppositeGender = gender.toLowerCase() === 'men' ? 'women' : 'men';
    const oppositeParentCategory = await findParentCategory(new RegExp(`^${oppositeGender}`, 'i'));

    const allCategories = await findAllCategories();

    const unlistedParentIds = allCategories
        .filter(cat => cat.isListed === false || cat.isListed === 'false')
        .map(cat => cat._id.toString());

    const activeCategories = allCategories.filter(cat => {
        if (cat.isListed === false || cat.isListed === 'false') return false;

        if (cat.parentCategory) {
            const parentIdStr = typeof cat.parentCategory === 'object' && cat.parentCategory._id 
                ? cat.parentCategory._id.toString() 
                : cat.parentCategory.toString();

            if (unlistedParentIds.includes(parentIdStr)) return false;
        }
        return true;
    });

    let filteredSubcategories = [];

    if (oppositeParentCategory) {
        filteredSubcategories = activeCategories.filter(cat => {
            const currentParentIdStr = cat.parentCategory && (cat.parentCategory._id || cat.parentCategory).toString();
            const oppositeParentIdStr = oppositeParentCategory._id.toString();
            
            const belongsToOppositeGender = cat.parentCategory && (currentParentIdStr === oppositeParentIdStr);
            const isRootNode = !cat.parentCategory;

            return !belongsToOppositeGender && !isRootNode;
        });
    } else {
        filteredSubcategories = activeCategories.filter(cat => cat.parentCategory);
    }

    const subIds = filteredSubcategories.map(c => c._id);

    const productQuery = buildGenderQuery(subIds, { category, price, brand, material, search });
    const filterQuery = buildGenderQuery(subIds, { category, price, material, search });

    const sortQuery = getSort(sort);
    const totalProducts = await productRepo.countProducts(productQuery);
    const products = await productRepo.findProducts(productQuery, sortQuery, (page - 1) * limit, limit);
    
    const brands = await productRepo.distinctBrandsByQuery(filterQuery);
    const materials = await productRepo.distinctMaterials(filterQuery);

    return {
        products,
        subcategories: filteredSubcategories, 
        brands,
        materials,
        genderTitle: gender,
        currentPage: Number(page),
        totalPages: Math.ceil(totalProducts / limit) || 1,
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        prevPage: Number(page) - 1,
        nextPage: Number(page) + 1,
        activeCategory: category || null,
        activePrice: price || "all",
        activeSort: sort || null,
        activeMaterial: material || null,
        activeBrand: brand || null
    };
};

const getSort = (sort) => {
    if (sort === 'low-high') return { regularPrice: 1 };
    if (sort === 'high-low') return { regularPrice: -1 };
    if (sort === 'popularity') return { salesCount: -1 };
    if (sort === 'a-z') return { productName: 1 };
    if (sort === 'z-a') return { productName: -1 };
    return { createdAt: -1 };
};

/* ---------------- PRODUCT DETAILS LAYER ---------------- */

export const getProductDetails = async (id) => {
    const product = await productRepo.findProductById(id);
    if (!product) return null;

    const relatedProducts = await productRepo.findRelatedProducts(product);

    return {
        product,
        relatedProducts
    };
};

export const getProductsPage = async (queryParams) => {
    const searchQuery = queryParams.search ? queryParams.search.trim() : '';
    const page = parseInt(queryParams.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let searchFilter = {};
    if (searchQuery) {
        searchFilter = { productName: { $regex: searchQuery, $options: 'i' } };
    }

    const sortQuery = { createdAt: -1 };
    const products = await productRepo.findProducts(searchFilter, sortQuery, skip, limit);
    const totalProducts = await productRepo.countProducts(searchFilter);
    const rawCategories = await findAllCategories();
    const totalPages = Math.ceil(totalProducts / limit);

    const parentCategories = rawCategories.filter(cat => !cat.parentCategory);
    const subcategories = rawCategories.filter(cat => cat.parentCategory);

    return {
        isAdmin: true,
        activePage: 'products',
        products,
        startIndex: skip,
        parentCategories,
        subcategories,
        pagination: {
            page,
            limit,
            totalPages: totalPages || 1,
            totalProducts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        },
        searchQuery
    };
};

export const getAddProductPage = async () => {
    const parentCategories = await findParentCategories();
    return {
        isAdmin: true,
        activePage: 'products',
        parentCategories
    };
};

export const getEditProductPage = async (productId) => {
    const product = await productRepo.findProductById(productId);
    if (!product) throw new Error("Product not found");

    const parentCategories = await findParentCategories();
    const selectedParentId = product.Category?.parentCategory?._id || product.Category?.parentCategory;

    const subcategories = selectedParentId
        ? await findSubCategoriesByParent(selectedParentId)
        : [];

    return {
        product,
        parentCategories,
        subcategories, 
        selectedParentId
    };
};

/* ---------------- MUTATIONS & MANAGEMENTS ---------------- */

export const createProduct = async (body, files) => {
    const {
        productName, brand, regularPrice, salePrice, description,
        category, parentCategory, countryOfOrigin, material, closureType, soleType, weight
    } = body;

    if (!productName?.trim()) throw new Error("Product name is required");
    if (!brand?.trim()) throw new Error("Brand is required");
    if (!description?.trim()) throw new Error("Description is required");
    if (!parentCategory) throw new Error("Please select a parent category");
    if (!category) throw new Error("Please select a subcategory");
    if (!regularPrice || Number(regularPrice) <= 0) throw new Error("Enter a valid price");

    const existingProduct = await productRepo.findDuplicateProduct(productName, category);
    if (existingProduct) {
        throw new Error(`A product named "${productName.trim()}" by ${brand.trim()} already exists in this category!`);
    }

    let finalVariantsArray = [];
    let globalTotalStockCount = 0;
    
    const colorNames = Array.isArray(body.colorNames) ? body.colorNames : [body.colorNames];
    const colorsHex = Array.isArray(body.colorHex) ? body.colorHex : [body.colorHex];

    for (let index = 0; index < colorNames.length; index++) {
        const colorName = colorNames[index];
        const hex = colorsHex[index] || '#000000';
        
        const variantSizes = body[`sizes_${index}`] || [];
        const variantStocks = body[`stocks_${index}`] || [];
        
        const sizeArray = Array.isArray(variantSizes) ? variantSizes : [variantSizes];
        const stockArray = Array.isArray(variantStocks) ? variantStocks : [variantStocks];

        let nestedSizesArray = [];
        sizeArray.forEach((sz, sIdx) => {
            const stockNum = Number(stockArray[sIdx]) || 0;
            globalTotalStockCount += stockNum;
            
            nestedSizesArray.push({
                size: Number(sz),
                stock: stockNum 
            });
        });

        let variantImagePaths = [];
        if (files && files[`variantImages_${index}`]) {
            const fieldFiles = files[`variantImages_${index}`];
            for (const file of fieldFiles) {
                
                validateUploadedFile(file);

                const cloudUrl = await uploadToCloudinary(file.buffer);
                variantImagePaths.push(cloudUrl);
            }
        }

        if (variantImagePaths.length === 0) {
            throw new Error(`Please upload at least one image file for variant: ${colorName || 'Index ' + index}`);
        }

        finalVariantsArray.push({
            colorName: colorName || 'Default',
            colorHex: hex,
            images: variantImagePaths, 
            sizes: nestedSizesArray
        });
    }

    await brandRepo.ensureBrandExists(brand.trim());

    const productData = {
        productName: productName.trim(),
        brand: brand.trim(),
        parentCategory: parentCategory, 
        Category: category,
        regularPrice: Number(regularPrice) || 0,
        salePrice: salePrice ? Number(salePrice) : null,
        description: description.trim(),
        variants: finalVariantsArray,
        totalQuantity: globalTotalStockCount,
        isListed: true,
        countryOfOrigin: countryOfOrigin?.trim() || 'India',
        material: material?.trim() || 'Leather',
        closureType: closureType?.trim() || 'Lace up',
        soleType: soleType?.trim() || 'Rubber',
        weight: weight?.trim() || '300g'
    };

    await productRepo.createProduct(productData);
};

export const updateProduct = async (productId, bodyData, structuredFiles) => {
    const existingProduct = await productRepo.findProductById(productId);
    if (!existingProduct) throw new Error("Product not found");

    const {
        productName, brand, regularPrice, description,
        category, parentCategory, material, closureType,
        soleType, weight, countryOfOrigin, colorNames, colorHex
    } = bodyData;

    const updatedVariants = [];
    let globalTotalStockCount = 0;

    const colorNamesArr = Array.isArray(colorNames) ? colorNames : [colorNames];
    const colorHexArr = Array.isArray(colorHex) ? colorHex : [colorHex];

    const dbVariantsMap = {};
    if (existingProduct.variants && Array.isArray(existingProduct.variants)) {
        existingProduct.variants.forEach(v => {
            if (v._id) {
                dbVariantsMap[v._id.toString()] = v;
            }
        });
    }

    for (let i = 0; i < colorNamesArr.length; i++) {
        const colorName = colorNamesArr[i]?.trim();
        if (!colorName) continue;

        let activeImages = [];

        if (structuredFiles && structuredFiles[`variantImages_${i}`]) {
            const fieldFiles = structuredFiles[`variantImages_${i}`];
            for (const file of fieldFiles) {
                
                validateUploadedFile(file);

                const cloudUrl = await uploadToCloudinary(file.buffer);
                activeImages.push(cloudUrl);
            }
        }

        const incomingVariantId = bodyData[`variantId_${i}`]; 
        let existingVariant = null;

        if (incomingVariantId && dbVariantsMap[incomingVariantId]) {
            existingVariant = dbVariantsMap[incomingVariantId];
        } else if (existingProduct.variants && existingProduct.variants[i]) {
            existingVariant = existingProduct.variants[i];
        }
        
        if (existingVariant) {
            const removedField = bodyData[`removedImages_${i}`];
            const removedImages = Array.isArray(removedField) ? removedField : (removedField ? [removedField] : []);
            
            const remainingImages = existingVariant.images.filter(img => !removedImages.includes(img));
            activeImages = [...remainingImages, ...activeImages];
        }

        if (activeImages.length < 3) {
            throw new Error(`The color variant "${colorName}" must have at least 3 images. Add more files or remove fewer existing images.`);
        }

        const sizesInput = bodyData[`sizes_${i}`] || [];
        const stocksInput = bodyData[`stocks_${i}`] || [];
        
        const sizesArr = Array.isArray(sizesInput) ? sizesInput : [sizesInput];
        const stocksArr = Array.isArray(stocksInput) ? stocksInput : [stocksInput];

        const sizesObj = sizesArr.map((size, idx) => {
            const stockNum = Number(stocksArr[idx] || 0);
            globalTotalStockCount += stockNum;
            return {
                size: Number(size),
                stock: stockNum
            };
        }).filter(s => s.size > 0);

        const variantPayload = {
            colorName,
            colorHex: colorHexArr[i] || '#000000',
            images: activeImages, 
            sizes: sizesObj
        };

        if (existingVariant && existingVariant._id) {
            variantPayload._id = existingVariant._id;
        }

        updatedVariants.push(variantPayload);
    }

    const updateData = {
        productName: productName.trim(),
        brand: brand.trim(),
        regularPrice: Number(regularPrice),
        description: description?.trim(),
        Category: category,
        parentCategory: parentCategory,
        material: material?.trim(),
        closureType: closureType?.trim(),
        soleType: soleType?.trim(),
        weight: weight?.trim(),
        countryOfOrigin: countryOfOrigin?.trim(),
        variants: updatedVariants,
        totalQuantity: globalTotalStockCount
    };

    return await productRepo.updateProduct(productId, updateData);
};

export const toggleProductStatus = async (productId) => {
    const product = await productRepo.findProductById(productId);
    if (!product) throw new Error('Product not found.');

    const nextVisibilityState = !product.isListed;
    await productRepo.updateProduct(productId, { isListed: nextVisibilityState });

    return {
        message: `${product.productName} has been ${nextVisibilityState ? 'listed' : 'unlisted'}.`
    };
};
