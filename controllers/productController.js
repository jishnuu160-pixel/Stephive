import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import mongoose from 'mongoose';


export const getShop = async (req, res) => {
    try {
        const { gender } = req.params;
        const { category, price, material, sort, brand, search } = req.query;

        let queryCondition = { isListed: true };
        if (gender) queryCondition.gender = gender;
    
        let rawProducts = await Product.find(queryCondition).lean();

        let products = Array.isArray(rawProducts) ? rawProducts.flat(Infinity) : [];

        if (search) {
            const userInputVariable = search.trim().toLowerCase();

            products = products.filter(product => {
                if (!product) return false;
                
                const item = Array.isArray(product) ? product : product;
                if (!item) return false;

                const dbProductName = (item.productName || item.name || "").toLowerCase();
                const dbProductBrand = (item.brand || "").toLowerCase();

                return dbProductName.includes(userInputVariable) || dbProductBrand.includes(userInputVariable);
            });
        }

        if (category) products = products.filter(p => p.category?.toString() === category.toString());
        if (material) products = products.filter(p => p.material?.toLowerCase() === material.toLowerCase());
        if (brand) products = products.filter(p => p.brand?.toLowerCase() === brand.toLowerCase());

        if (price && price !== 'all') {
            if (price === 'under5k') products = products.filter(p => p.regularPrice < 5000);
            else if (price === '5k-10k') products = products.filter(p => p.regularPrice >= 5000 && p.regularPrice <= 10000);
            else if (price === 'above10k') products = products.filter(p => p.regularPrice > 10000);
        }
       
        if (sort === 'low-high') products.sort((a, b) => a.regularPrice - b.regularPrice);
        else if (sort === 'high-low') products.sort((a, b) => b.regularPrice - a.regularPrice);

        if (search && products.length > 0) {
            const finalFlatList = products.flat(Infinity);

            if (finalFlatList.length === 1) {
                const matchedProduct = finalFlatList;
         
                const targetId = matchedProduct._id || matchedProduct.id;

                if (targetId) {
                    const cleanIdString = targetId.toString().trim();
                    console.log(`🚀 PERFECT CLEAN MATCH FOUND: ${cleanIdString}`);
                    console.log(`🚀 FORCING REDIRECT ROUTE TO: /details/${cleanIdString}`);
                    
                    return res.status(302).redirect(`/details/${cleanIdString}`);
                }
            }
        }

        return res.render('user/shop', {
            products: products.flat(Infinity),
            genderTitle: gender || "All Collections",
            activeCategory: category,
            activePrice: price,
            activeMaterial: material,
            activeSort: sort,
            activeBrand: brand,
            currentSearch: search
        });

    } catch (error) {
        console.error("❌ CRITICAL SHOP ROUTE ENGINE FAILURE:", error);
        if (!res.headersSent) {
            res.status(500).send("Error compiling product catalog layouts.");
        }
    }
};

export const getWomenShopPage = async (req, res) => {
    try {
        const { category, price, sort, material, brand, page = 1 } = req.query;
        const limit = 6; 

        const parentWomenCategory = await Category.findOne({ 
            name: { $regex: /^women/i } 
        }).lean();

        let womenSubcategories = [];
        let womenSubcategoryIds = [];

        if (parentWomenCategory) {
            womenSubcategories = await Category.find({
                $or: [
                    { parentCategory: parentWomenCategory._id },
                    { parentId: parentWomenCategory._id }
                ],
                isListed: true
            }).lean();
            
            womenSubcategoryIds = womenSubcategories.map(cat => cat._id.toString());
        }

    
        const objectIdArray = womenSubcategoryIds.map(id => 
            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
        );

        let query = {
            $or: [
                { Category: { $in: objectIdArray } },
                { category: { $in: objectIdArray } }
            ],
            isListed: true
        };


        const dynamicBrands = await Product.distinct('brand', {
            $or: [{ Category: { $in: objectIdArray } }, { category: { $in: objectIdArray } }],
            isListed: true
        });
        
        const dynamicMaterials = await Product.distinct('material', {
            $or: [{ Category: { $in: objectIdArray } }, { category: { $in: objectIdArray } }],
            isListed: true
        });

        if (category) {
            const targetCat = womenSubcategories.find(c => 
                c.name.toLowerCase() === category.toLowerCase() || c._id.toString() === category
            );
            if (targetCat) {
                const catId = mongoose.Types.ObjectId.isValid(targetCat._id) ? new mongoose.Types.ObjectId(targetCat._id) : targetCat._id;
                query.$or = [
                    { Category: catId },
                    { category: catId }
                ];
            }
        }
        
        if (brand) query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
        if (material) query.material = { $regex: new RegExp(`^${material}$`, 'i') };

        if (price && price !== 'all') {
            if (price === 'under5k') query.regularPrice = { $lt: 5000 };
            else if (price === '5k-10k') query.regularPrice = { $gte: 5000, $lte: 10000 };
            else if (price === 'above10k') query.regularPrice = { $gt: 10000 };
        }

        let sortQuery = { createdAt: -1 }; 
        if (sort === 'low-high') sortQuery = { regularPrice: 1 };
        else if (sort === 'high-low') sortQuery = { regularPrice: -1 };
        else if (sort === 'popularity') sortQuery = { salesCount: -1 }; 
        else if (sort === 'a-z') sortQuery = { productName:1 };
        else if (sort === 'z-a') sortQuery ={ productName:-1 }; 

        const totalProducts = await Product.countDocuments(query);
        const womenProducts = await Product.find(query)
            .populate('Category')
            .sort(sortQuery)
            .skip((parseInt(page) - 1) * limit)
            .limit(limit)
            .lean();

        res.render('user/gender', {
            products: womenProducts,
            subcategories: womenSubcategories || [], 
            brands: dynamicBrands || [],             
            materials: dynamicMaterials || [],       
            genderTitle: "Women",              
            activeCategory: category,
            activePrice: price,
            activeSort: sort,
            activeMaterial: material,
            activeBrand: brand,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit) || 1,
            hasPrevPage: parseInt(page) > 1,
            hasNextPage: parseInt(page) < Math.ceil(totalProducts / limit),
            prevPage: parseInt(page) - 1,
            nextPage: parseInt(page) + 1
        });

    } catch (error) {
        console.error("❌ CRITICAL FAILURE ON WOMEN SHOP ROUTE:", error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
};

export const getMenShopPage = async (req, res) => {
    try {
        const { category, price, sort, material, brand, page = 1 } = req.query;
        const limit = 6; 

        const parentMenCategory = await Category.findOne({ 
            name: { $regex: /^men/i } 
        }).lean();

        let menSubcategories = [];
        let menSubcategoryIds = [];

        if (parentMenCategory) {
            menSubcategories = await Category.find({ 
                $or: [
                    { parentCategory: parentMenCategory._id },
                    { parentId: parentMenCategory._id }
                ],
                isListed: true
            }).lean();
            
            menSubcategoryIds = menSubcategories.map(cat => cat._id.toString());
        }

        const objectIdArray = menSubcategoryIds.map(id => 
            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
        );

        let query = {
            $or: [
                { Category: { $in: objectIdArray } },
                { category: { $in: objectIdArray } }
            ],
            isListed: true
        };

        const dynamicBrands = await Product.distinct('brand', {
            $or: [{ Category: { $in: objectIdArray } }, { category: { $in: objectIdArray } }],
            isListed: true
        });
        
        const dynamicMaterials = await Product.distinct('material', {
            $or: [{ Category: { $in: objectIdArray } }, { category: { $in: objectIdArray } }],
            isListed: true
        });

        if (category) {
            const targetCat = menSubcategories.find(c => 
                c.name.toLowerCase() === category.toLowerCase() || c._id.toString() === category
            );
            if (targetCat) {
                const catId = mongoose.Types.ObjectId.isValid(targetCat._id) ? new mongoose.Types.ObjectId(targetCat._id) : targetCat._id;
                query.$or = [
                    { Category: catId },
                    { category: catId }
                ];
            }
        }
        
        if (brand) query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
        if (material) query.material = { $regex: new RegExp(`^${material}$`, 'i') };

        
        if (price && price !== 'all') {
            if (price === 'under5k') query.regularPrice = { $lt: 5000 };
            else if (price === '5k-10k') query.regularPrice = { $gte: 5000, $lte: 10000 };
            else if (price === 'above10k') query.regularPrice = { $gt: 10000 };
        }


        let sortQuery = { createdAt: -1 }; 
        if (sort === 'low-high') sortQuery = { regularPrice: 1 };
        else if (sort === 'high-low') sortQuery = { regularPrice: -1 };
        else if (sort === 'popularity') sortQuery = { salesCount: -1 }; 
        else if (sort === 'a-z') sortQuery = { productName:1 };
        else if (sort === 'z-a') sortQuery ={ productName:-1 }; 

      
        const totalProducts = await Product.countDocuments(query);
        const menProducts = await Product.find(query)
            .populate('Category')
            .sort(sortQuery)
            .skip((parseInt(page) - 1) * limit)
            .limit(limit)
            .lean();

       
        res.render('user/gender', {
            products: menProducts,
            subcategories: menSubcategories || [], 
            brands: dynamicBrands || [],             
            materials: dynamicMaterials || [],       
            genderTitle: "Men",              
            activeCategory: category,
            activePrice: price,
            activeSort: sort,
            activeMaterial: material,
            activeBrand: brand,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit) || 1,
            hasPrevPage: parseInt(page) > 1,
            hasNextPage: parseInt(page) < Math.ceil(totalProducts / limit),
            prevPage: parseInt(page) - 1,
            nextPage: parseInt(page) + 1
        });

    } catch (error) {
        console.error("❌ CRITICAL FAILURE ON MEN SHOP ROUTE:", error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
};

export const getProductId = async (req, res) => {
    try {
        const productId = req.params.id;
        
        const product = await Product.findById(productId).populate('Category').lean();
        
        if (!product) {
            return res.status(404).render('user/404', { message: "Product not found" });
        }
        
        res.render('user/productPage', { 
            product,
            user: req.session.user || null 
        });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).redirect('/shop');
        }
        res.status(500).send("Internal Server Error");
    }
};