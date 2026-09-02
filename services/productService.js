import * as productRepo from '../repositories/productRepository.js';
import * as brandRepo from '../repositories/brandRepository.js';
import { isOfferActiveByDate } from '../utils/dateHelper.js';
import {findParentCategory,findAllCategories,findParentCategories,findSubCategoriesByParent} from '../repositories/categoryRepository.js';
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

export const attachOfferPricing = async (productDoc) => {
    const product = typeof productDoc.toObject === 'function'
            ? productDoc.toObject()
            : { ...productDoc };

    const regularPrice = Number(product.regularPrice) || 0;

    let productDiscountAmt = 0;
    let productDiscountPct = 0;

    let categoryDiscountAmt = 0;
    let categoryDiscountPct = 0;

    // ---------------- PRODUCT OFFERS ----------------

    const productOffers = Array.isArray(product.offer)
        ? product.offer
        : product.offer
            ? [product.offer]
            : [];

    const activeProductOffers = productOffers.filter(
        offer => offer.isActive && isOfferActiveByDate(offer)
    );

    for (const offer of activeProductOffers) {
        const val = parseFloat(offer.discountValue) || 0;
        const offerType = String(offer.offerType || '')
            .trim()
            .toLowerCase();

        let discountAmt = 0;
        let discountPct = 0;

        if (offerType === 'percentage') {
            discountAmt = regularPrice * (val / 100);
            discountPct = val;
        } else {
            discountAmt = val;
            discountPct = regularPrice > 0
                ? (val / regularPrice) * 100
                : 0;
        }

        if (discountAmt > productDiscountAmt) {
            productDiscountAmt = discountAmt;
            productDiscountPct = Math.round(discountPct);
        }
    }


    // ---------------- CATEGORY OFFERS ----------------

    const categoryId = product.Category?._id || product.Category;

    if (categoryId) {
        const category = await mongoose
            .model('Category')
            .findById(categoryId)
            .populate('parentCategory');

        if (category) {

            // -------- SUBCATEGORY OFFER --------

            const categoryOffers = Array.isArray(category.offer)
                ? category.offer
                : category.offer
                    ? [category.offer]
                    : [];

            const activeCategoryOffers = categoryOffers.filter(
                offer => offer.isActive && isOfferActiveByDate(offer)
            );

            for (const offer of activeCategoryOffers) {

                const val = parseFloat(offer.discountValue) || 0;

                const offerType = String(offer.offerType || '')
                    .trim()
                    .toLowerCase();

                let discountAmt = 0;
                let discountPct = 0;

                if (offerType === 'percentage') {
                    discountAmt = regularPrice * (val / 100);
                    discountPct = val;
                } else {
                    discountAmt = val;
                    discountPct = regularPrice > 0
                        ? (val / regularPrice) * 100
                        : 0;
                }

                if (discountAmt > categoryDiscountAmt) {
                    categoryDiscountAmt = discountAmt;
                    categoryDiscountPct = Math.round(discountPct);
                }
            }


            // -------- PARENT CATEGORY OFFER --------

            const parentCat = category.parentCategory;

            if (parentCat) {
                const parentOffers = Array.isArray(parentCat.offer)
                    ? parentCat.offer
                    : parentCat.offer
                        ? [parentCat.offer]
                        : [];

                const activeParentOffers = parentOffers.filter(
                    offer => offer.isActive && isOfferActiveByDate(offer)
                );

                for (const offer of activeParentOffers) {
                    const val = parseFloat(offer.discountValue) || 0;

                    const offerType = String(offer.offerType || '')
                        .trim()
                        .toLowerCase();

                    let discountAmt = 0;
                    let discountPct = 0;

                    if (offerType === 'percentage') {
                        discountAmt = regularPrice * (val / 100);
                        discountPct = val;
                    } else {
                        discountAmt = val;
                        discountPct = regularPrice > 0
                            ? (val / regularPrice) * 100
                            : 0;
                    }

                    if (discountAmt > categoryDiscountAmt) {
                        categoryDiscountAmt = discountAmt;
                        categoryDiscountPct = Math.round(discountPct);
                    }
                }
            }
        }
    }


// ---------------- FINAL OFFER ----------------

let effectiveDiscount = 0;
let maxDiscountAmount = 0;

if (productDiscountAmt > categoryDiscountAmt) {
    maxDiscountAmount = productDiscountAmt;
    effectiveDiscount = productDiscountPct;
}

else if (categoryDiscountAmt > productDiscountAmt) {
    maxDiscountAmount = categoryDiscountAmt;
    effectiveDiscount = categoryDiscountPct;
}

else if (productDiscountAmt === categoryDiscountAmt && productDiscountAmt > 0) {
    maxDiscountAmount = productDiscountAmt;

    effectiveDiscount = Math.max(
        productDiscountPct,
        categoryDiscountPct
    );
}

const salePrice = Math.max(0, regularPrice - maxDiscountAmount);

return {
    ...product,
    regularPrice,
    salePrice: Math.round(salePrice),
    discountAmount: Math.round(maxDiscountAmount),
    effectiveDiscount: Math.round(effectiveDiscount),
    hasOffer: maxDiscountAmount > 0
};
};


export const getShopProducts = async (req) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const startIndex = skip;

        const allCategories = await findAllCategories();

        const isCategoryActive = (cat) => {
            if (cat.isUnlisted === true || cat.isUnlisted === 'true') return false;
            if (cat.isListed === false || cat.isListed === 'false') return false;
            
            if (cat.parentCategory) {
                const parent = allCategories.find(c => c._id.toString() === (cat.parentCategory._id || cat.parentCategory).toString());
                if (parent && (parent.isUnlisted === true || parent.isUnlisted === 'true' || parent.isListed === false || parent.isListed === 'false')) {
                    return false;
                }
            }
            return true;
        };

        const activeCategoryObjectIds = allCategories
            .filter(cat => cat.parentCategory !== null && isCategoryActive(cat))
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
            const selectedNames = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
        
            const matchingCategories = await productRepo.getCategoryIdsByNames(selectedNames);
            const targetIds = matchingCategories.map(c => c._id);
        
            if (targetIds.length > 0) {
                searchFilter.Category = { $in: targetIds };
            }
        }

        if (req.query.brand) {
            const brandIds = Array.isArray(req.query.brand) ? req.query.brand : [req.query.brand];
            searchFilter.brand = { $in: brandIds };
        }

        if (req.query.price && req.query.price !== 'all') {
            if (req.query.price === 'under5k') searchFilter.regularPrice = { $lt: 5000 };
            else if (req.query.price === '5k-10k') searchFilter.regularPrice = { $gte: 5000, $lte: 10000 };
            else if (req.query.price === 'above10k') searchFilter.regularPrice = { $gt: 10000 };
        }

        if (req.query.material) {
            searchFilter.material = { $regex: new RegExp(`^${req.query.material}$`, 'i') };
        }

        const filterForOptions = { ...searchFilter };
        delete filterForOptions.brand;
        delete filterForOptions.material;

        const [rawProducts, totalProducts, rawBrands, rawMaterials] = await Promise.all([
            productRepo.findProducts(searchFilter, getSort(req.query.sort), skip, limit), 
            productRepo.countProducts(searchFilter),
            productRepo.distinctBrandsByQuery(filterForOptions),
            productRepo.distinctMaterials(filterForOptions)      
        ]);


        const products = await Promise.all(
            rawProducts.map(prodDoc => attachOfferPricing(prodDoc))
        );

        const brands = rawBrands.map(brandName => ({
            name: brandName,
            isSelected: Array.isArray(req.query.brand) 
                ? req.query.brand.includes(brandName) 
                : req.query.brand === brandName 
        }));

        const materials = rawMaterials.map(m => ({
            name: m,
            isSelected: req.query.material === m
        }));   

        const totalPages = Math.ceil(totalProducts / limit);

        const categoryMap = {};
        allCategories.forEach(cat => {
            if (cat.parentCategory !== null) {
                if (!categoryMap[cat.name]) {
                    categoryMap[cat.name] = false;
                }
                if (isCategoryActive(cat)) {
                    categoryMap[cat.name] = true;
                }
            }
        });

        const filteredCategoriesForUI = Object.keys(categoryMap)
            .filter(catName => categoryMap[catName]) 
            .map(catName => ({
                name: catName,
                isSelected: req.query.category 
                    ? (Array.isArray(req.query.category) ? req.query.category.includes(catName) : req.query.category === catName) 
                    : false
            }));

        return {
            products,
            materials,
            brands,
            startIndex,
            currentPage: page,
            totalPages: totalPages || 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchValue: req.query.search || "",
            categories: filteredCategoriesForUI
        };
    } catch (error) {
        console.error("Error inside getShopProducts:", error);
        throw error;
    }
};

export const getBestSellers = async () => {
    try {
        const bestSellersRaw = await productRepo.getBestSellers(); 
        
        return await Promise.all(
            bestSellersRaw.map(productDoc => attachOfferPricing(productDoc))
        );
    } catch (error) {
        console.error("Error fetching best sellers in service:", error);
        return [];
    }
};

export const getLatestSellers = async () => {
    try {
        const latestSellersRaw = await productRepo.findProducts({ isListed: true }, { createdAt: -1 }, 0, 4);
        
        return await Promise.all(
            latestSellersRaw.map(productDoc => attachOfferPricing(productDoc))
        );
    } catch (error) {
        console.error("Error fetching latest sellers:", error);
        return [];
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

/* ---------------- PRODUCT DETAILS LAYER ---------------- */

export const getProductDetails = async (id) => {
    const productDoc = await productRepo.findProductById(id);
    if (!productDoc) return null;

    const product = await attachOfferPricing(productDoc);

    const rawRelatedProducts = await productRepo.findRelatedProducts(product);

    const relatedProducts = await Promise.all(
        rawRelatedProducts.map(relProdDoc => attachOfferPricing(relProdDoc))
    );

    return {
        product,
        relatedProducts
    };
};

const calculateTotalStock = (product) => {
    return (product.variants || []).reduce((acc, variant) => {
        const variantTotal = (variant.sizes || []).reduce((sSum, sz) => sSum + (sz.stock || 0), 0);
        return acc + variantTotal;
    }, 0);
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
    
    const productsWithStock = products.map(product => ({
        ...product,
        displayStock: calculateTotalStock(product) 
    }));

    const totalProducts = await productRepo.countProducts(searchFilter);
    const rawCategories = await findAllCategories();
    const totalPages = Math.ceil(totalProducts / limit);

    return {
        isAdmin: true,
        activePage: 'products',
        products: productsWithStock, 
        startIndex: skip,
        parentCategories: rawCategories.filter(cat => !cat.parentCategory),
        subcategories: rawCategories.filter(cat => cat.parentCategory),
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
    const rawBrands = await brandRepo.getAllBrands();
    const brands = rawBrands
        .filter(b => b.isListed !== false)
        .map(b => b.name);

    return {
        isAdmin: true,
        activePage: 'products',
        parentCategories,
        brands 
    };
};

export const getEditProductPage = async (productId) => {
    const product = await productRepo.findProductById(productId);
    if (!product) throw new Error("Product not found");

    const parentCategories = await findParentCategories();
    const brands = await productRepo.distinctBrands();
    const selectedParentId = product.Category?.parentCategory?._id || product.Category?.parentCategory;

    const subcategories = selectedParentId
        ? await findSubCategoriesByParent(selectedParentId)
        : [];

    return {
        product,
        parentCategories,
        subcategories, 
        selectedParentId,
        brands
    };
};

/* ---------------- MUTATIONS & MANAGEMENTS ---------------- */

export const createProduct = async (body, files) => {
    const {
        productName, brand, regularPrice, description,
        category, parentCategory, countryOfOrigin, material, closureType, soleType, weight
    } = body;
    const errors={};

    const productValue = /^[A-Za-z\s]+$/;
    if (!productName?.trim()){
       errors.productName = "Product name is required.";
    } else if(!productValue.test(productValue)){
       errors.productName = "Should contain only letters and space.";
    }

    if (!brand?.trim()) errors.brand =("Brand is required");

    const descriptionValue = /^[A-Za-z\s]+$/;
    if (!description?.trim()){
      errors.description = ("Description is required");
    } else if(!descriptionValue.test(description)){
       errors.description = ("Should contain only letters and space."); 
    } 

    if (!parentCategory) errors.parentCategory = ("Please select a parent category");
    if (!category) errors.Category = ("Please select a subcategory");


   if (!regularPrice || isNaN(Number(regularPrice))) {
    errors.Price = ("Enter a valid price");
   } else if (Number(regularPrice) <= 500) {
    errors.Price = ("Price must be greater than 500"); 
   }

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

    const parsedRegularPrice = Number(regularPrice) || 0;

    const productData = {
        productName: productName.trim(),
        brand: brand.trim(),
        parentCategory: parentCategory, 
        Category: category,
        regularPrice: parsedRegularPrice, 
        salePrice: parsedRegularPrice ,
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
    const errors = {};

    const productName = bodyData.productName?.trim();
    const brand = bodyData.brand?.trim();
    const regularPrice = bodyData.regularPrice;
    const description = bodyData.description?.trim();
    const category = bodyData.category;
    const parentCategory = bodyData.parentCategory;
    const material = bodyData.material?.trim();
    const closureType = bodyData.closureType?.trim();
    const soleType = bodyData.soleType?.trim();
    const weight = bodyData.weight?.trim();
    const countryOfOrigin = bodyData.countryOfOrigin?.trim();

    const nameRegex = /^[A-Za-z\s]+$/;

    if (!productName) {
        errors.productName = "Product name is required.";
    } else if (!nameRegex.test(productName)) {
        errors.productName = "Product name should only contain letters and spaces.";
    }
    if (!brand) errors.brand = "Brand selection is required.";
    if (!regularPrice || Number(regularPrice) <= 500) {
        errors.regularPrice = "Base price must be greater than 500.";
    }
    if (!description) errors.description = "Description is required.";
    if (!category) errors.category = "Subcategory/Category is required.";
    if (!parentCategory) errors.parentCategory = "Parent category is required.";
    if (!material) errors.material = "Material is required.";
    if (!closureType) errors.closureType = "Closure type is required.";
    if (!soleType) errors.soleType = "Sole type is required.";
    if (!weight) errors.weight = "Weight is required.";
    if (!countryOfOrigin) errors.countryOfOrigin = "Country of origin is required.";

    const existingProduct = await productRepo.findProductById(productId);
    if (!existingProduct) {
        throw new Error("Product not found in database.");
    }

    const normalizeArray = (val) => {
        if (val === undefined || val === null) return [];
        return Array.isArray(val) ? val : [val];
    };

    const extractIndexedArray = (body, prefix, index) => {
        const directKey = `${prefix}_${index}`;
        const arrayKey = `${prefix}_${index}[]`;

        if (body[directKey] !== undefined) return normalizeArray(body[directKey]);
        if (body[arrayKey] !== undefined) return normalizeArray(body[arrayKey]);

        const keys = Object.keys(body).filter(k => 
            new RegExp(`^${prefix}_${index}\\[\\d+\\]$`).test(k)
        );
        if (keys.length > 0) {
            return keys.map(k => body[k]);
        }
        return [];
    };

    const colorNamesArr = normalizeArray(bodyData.colorNames || bodyData['colorNames[]']);
    const colorHexArr = normalizeArray(bodyData.colorHex || bodyData['colorHex[]']);

    const dbVariantsMap = {};
    if (existingProduct.variants && Array.isArray(existingProduct.variants)) {
        existingProduct.variants.forEach(v => {
            if (v._id) dbVariantsMap[v._id.toString()] = v;
        });
    }

    let variantCount = colorNamesArr.length;
    if (variantCount === 0) {
        const indexedVariantKeys = Object.keys(bodyData).filter(k => k.startsWith('sizes_') || k.startsWith('variantId_'));
        const foundIndices = indexedVariantKeys.map(k => parseInt(k.split('_')[1])).filter(n => !isNaN(n));
        variantCount = foundIndices.length > 0 ? Math.max(...foundIndices) + 1 : 1;
    }

    const updatedVariants = [];
    let globalTotalStockCount = 0;
    const seenColorNames = new Set();

    for (let i = 0; i < variantCount; i++) {
        const colorName = colorNamesArr[i]?.trim();
        const hexValue = colorHexArr[i] || '#000000';
        const variantLabel = colorName ? `"${colorName}"` : `Variant #${i + 1}`;

        if (!colorName) {
            errors[`colorNames_${i}`] = "Color name is required.";
        } else {
            const lowerColorName = colorName.toLowerCase();
            if (seenColorNames.has(lowerColorName)) {
                errors[`colorNames_${i}`] = `The color name "${colorName}" is duplicated. Color names must be unique.`;
            } else {
                seenColorNames.add(lowerColorName);
            }
        }

        const incomingVariantId = bodyData[`variantId_${i}`];
        let existingVariant = incomingVariantId ? dbVariantsMap[incomingVariantId] : existingProduct.variants?.[i];

        let activeImages = [];

        if (existingVariant && Array.isArray(existingVariant.images)) {
            const removedField = bodyData[`removedImages_${i}`] || bodyData[`removedImages_${i}[]`];
            const removedImages = normalizeArray(removedField);
            activeImages = existingVariant.images.filter(img => !removedImages.includes(img));
        }

        if (structuredFiles && structuredFiles[`variantImages_${i}`]) {
            const fieldFiles = structuredFiles[`variantImages_${i}`];
            for (const file of fieldFiles) {
                try {
                    validateUploadedFile(file);
                    const cloudUrl = await uploadToCloudinary(file.buffer);
                    activeImages.push(cloudUrl);
                } catch (uploadErr) {
                    errors[`variantImages_${i}`] = uploadErr.message;
                }
            }
        }

        if (activeImages.length < 3) {
            errors[`variantImages_${i}`] = `Variant ${variantLabel} must have at least 3 images (currently has ${activeImages.length}).`;
        }

        const sizesArr = extractIndexedArray(bodyData, 'sizes', i);
        const stocksArr = extractIndexedArray(bodyData, 'stocks', i);

        const sizesObj = [];
        const seenSizesInVariant = new Set();

        if (sizesArr.length === 0) {
            errors[`sizes_${i}`] = `At least one size and stock entry is required for ${variantLabel}.`;
        } else {
            let hasSizeError = false;

            for (let idx = 0; idx < sizesArr.length; idx++) {
                const rawSize = sizesArr[idx] !== undefined && sizesArr[idx] !== null ? String(sizesArr[idx]).trim() : "";
                const rawStock = stocksArr[idx] !== undefined && stocksArr[idx] !== null ? String(stocksArr[idx]).trim() : "";

                if (rawSize === "") {
                    errors[`sizes_${i}`] = `Size value cannot be empty in ${variantLabel}.`;
                    hasSizeError = true;
                    break;
                }

                if (rawStock === "") {
                    errors[`sizes_${i}`] = `Stock value cannot be empty for size "${rawSize}" in ${variantLabel}.`;
                    hasSizeError = true;
                    break;
                }

                const parsedSize = Number(rawSize);
                const parsedStock = Number(rawStock);

                if (isNaN(parsedSize) || parsedSize <= 0) {
                    errors[`sizes_${i}`] = `Invalid size "${rawSize}" in ${variantLabel}. Must be a positive number.`;
                    hasSizeError = true;
                    break;
                }

                if (isNaN(parsedStock) || parsedStock < 0) {
                    errors[`sizes_${i}`] = `Stock for size ${parsedSize} in ${variantLabel} must be 0 or greater.`;
                    hasSizeError = true;
                    break;
                }

                if (seenSizesInVariant.has(parsedSize)) {
                    errors[`sizes_${i}`] = `Duplicate size ${parsedSize} found in ${variantLabel}. Sizes must be unique.`;
                    hasSizeError = true;
                    break;
                }

                seenSizesInVariant.add(parsedSize);
                sizesObj.push({ size: parsedSize, stock: parsedStock });
            }

            if (!hasSizeError) {
                sizesObj.forEach(item => {
                    globalTotalStockCount += item.stock;
                });
            }
        }

        updatedVariants.push({
            ...(existingVariant?._id && { _id: existingVariant._id }),
            colorName: colorName || '',
            colorHex: hexValue,
            images: activeImages,
            sizes: sizesObj
        });
    }

    if (Object.keys(errors).length > 0) {
        const validationError = new Error("Validation failed");
        validationError.fieldErrors = errors;
        throw validationError;
    }

    const updateData = {
        productName,
        brand,
        regularPrice: Number(regularPrice),
        description,
        Category: category,
        parentCategory,
        material,
        closureType,
        soleType,
        weight,
        countryOfOrigin,
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



