import  adminRepository, { findCategoriesWithPagination,countCategories } from '../repositories/adminRepository.js';
import User from '../models/userModel.js'; 
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import bcrypt from 'bcrypt';
import { title } from 'process';
import { group } from 'console';
import { stat } from 'fs';
import { createDeflate } from 'zlib';

export const getAdminLogin = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    req.flash("success");
    req.flash("error");

    res.render('admin/login', { 
        title: 'Admin Login',
        isAdmin: true,  
        isAdminLogin: true,
        isLogin: true  
    });
};

export const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await adminRepository.findAdminByEmail(email);

        if (!admin) {
            return res.render('admin/login', { 
                isAdmin: true,
                isAdminLogin: true,
                error:"Invalid Admin Email"
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

    
if (isMatch) {
    req.session.admin = {
        id: admin._id,
        email: admin.email
    };

    req.flash('success', 'Welcome back, Admin!');

    return req.session.save((err) => {
        if (err) {
            console.error("Session Save Error:", err);
        }
        res.redirect('/admin/dashboard');
    });
}else {
    return res.render('admin/login', { 
       isAdmin: true,
       isAdminLogin: true,
       error: "Incorrect Password" 
    });
}
    } catch (error) {
        console.error("Login Controller Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getDashboard = (req, res) => {

       res.render('admin/dashboard', {
        isAdmin: true, 
        title: 'Admin Dashboard',
        activePage:'dashboard',
        totalUsers:'totalUsers'
    });
};

export const getCustomers = async (req, res) => {
    try {
        const search = req.query.search || ''; 
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        let query = { isAdmin: { $ne: true } };

        if (search) {
            query.$and = [
                { isAdmin: { $ne: true } },
                {
                    $or: [
                        { fullName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

        const customersData = await User.find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('admin/customers', {
            isAdmin: true,
            title: 'Customer Management',
            activePage:'customers',
            startIndex:skip,
            users: customersData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchQuery: search 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (user) {
            user.isBlocked = !user.isBlocked; 
            await user.save();

            const statusLabel = user.isBlocked ? "blocked" : "unblocked";
            req.flash('success', `User ${user.fullName} has been ${statusLabel}`);
            
            return req.session.save((err) => {
                if (err) console.error("Session save error:", err);
                res.redirect('/admin/customers');
            });
        } else {
            req.flash('error', 'User not found.');
            return req.session.save(() => res.redirect('/admin/customers'));
        }
    } catch (error) {
        console.error("Status Toggle Error:", error);
        req.flash('error', 'Something went wrong. Please try again.');
        return req.session.save(() => res.redirect('/admin/customers'));
    }
};


export const adminLogout = (req, res) => {
    
    delete req.session.admin;

    req.session.save((err) => {
        if (err) {
            console.error("Logout save error:", err);
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/admin/login');
    });
};

export const getCategories = async (req, res) => {
    try {
        const search = req.query.search || ''; 
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit;


        let query = { parentCategory: { $ne: null } };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

      
        const subcategories = await Category.find(query)
            .populate('parentCategory')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const parentCategories=await Category.find({$or:[{parentCategory:null},{parentCategory:{$exists:false}}]}).lean();
        const totalItems = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        res.render('admin/categories', {
            isAdmin: true,
            activePage: 'categories',
            successMsg:req.flash('success'),
            categories: subcategories,
            parentCategories,
            startIndex: skip,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchQuery: search
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.redirect('/admin/dashboard');
    }
};

export const getProducts = async (req, res) => {
    try {

        const searchQuery = req.query.search ? req.query.search.trim() : "";

        let searchFilter = {};
        if (searchQuery) {
            searchFilter = {
                productName: { $regex: searchQuery, $options: 'i' } 
            };
        }

        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit;

        const [products, totalProducts, rawCategories] = await Promise.all([
            Product.find(searchFilter)
                .populate({
                    path: 'Category',
                    populate: {
                        path: 'parentCategory',
                        model: 'Category' 
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            
            Product.countDocuments(searchFilter),
            
            Category.find({}).lean()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        const parentCategories = rawCategories.filter(cat => 
            !cat.parentCategory || 
            cat.parentCategory === null || 
            String(cat.parentCategory).trim() === ""
        );
        
        const subcategories = rawCategories.filter(cat => 
            cat.parentCategory && 
            cat.parentCategory !== null && 
            String(cat.parentCategory).trim() !== ""
        );

       

        res.render('admin/product', { 
            isAdmin: true,
            activePage: 'products',
            products: products,
            startIndex: (page - 1) * limit, 

            parentCategories: parentCategories, 
            subcategories: subcategories,       
            
            pagination: {
                page: page,
                limit: limit,
                totalPages: totalPages || 1,
                totalProducts: totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            },
            
            searchQuery: searchQuery
        });

    } catch (error) {
        console.error("❌ ADMIN PRODUCTS PAGE LOADING FAILED:", error.message);
        res.status(500).send("Internal Server Error: Failed to render view data payload context layers.");
    }
};
export const getAddProduct= async(req,res)=>{
    try{
        const categories= await Category.find({parentCategory:{$ne:null}}).lean();
        console.log("categories found:",categories);
        res.render('admin/addProduct',
        {
            isAdmin:true,
            activePage:'products',
            categories
        });
    }catch(error){
        console.error('Error:',error);
        res.redirect('/admin/dashboard');
    }
}

export const toggleListing = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await Category.findById(id).populate('parentCategory');

        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/admin/categories');
        }

        category.isListed = !category.isListed;
        await category.save();

        const action = category.isListed ? 'listed' : 'unlisted';
        const parentName = category.parentCategory ? category.parentCategory.name : 'Main';

        req.flash('success', `${category.name} in ${parentName} has been ${action}`);
        
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Toggle Error:", error);
        req.flash('error', 'Internal Server Error');
        res.redirect('/admin/categories');
    }
};


export const postAddProduct = async (req, res) => {
    try {        
        const { 
            productName, 
            brand, 
            regularPrice, 
            salePrice, 
            description, 
            parentCategory, 
            category,
            variants,
            countryOfOrigin,  
            material,         
            closureType,      
            soleType,         
            weight            
        } = req.body;

    
        let resolvedCategoryId = null;
        if (category && parentCategory) {
            const matchingSubcategoryDoc = await Category.findOne({
                parentCategory: parentCategory, 
                name: category.trim()
            });
            if (matchingSubcategoryDoc) {
                resolvedCategoryId = matchingSubcategoryDoc._id;
            } else {
                resolvedCategoryId = parentCategory; 
            }
        }

        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => file.filename);
        } else {
            imagePaths = ["placeholder-shoe.jpg"];
        }

        let finalVariantsArray = [];
        let globalTotalStockCount = 0;

        if (variants) {
            const rawGroups = Array.isArray(variants) ? variants : Object.values(variants);

            finalVariantsArray = rawGroups.map(group => {
                const rawSizes = group.sizes 
                    ? (Array.isArray(group.sizes) ? group.sizes : Object.values(group.sizes)) 
                    : [];

                const processedSizes = rawSizes.map(item => {
                    const stockNum = Number(item.stock) || 0;
                    globalTotalStockCount += stockNum; 
                    return {
                        size: Number(item.size),
                        stock: stockNum
                    };
                });

                return {
                    colorName: group.colorName ? group.colorName.trim() : "Black",
                    colorHex: group.colorHex || "#1a202c",
                    sizes: processedSizes
                };
            });
        }

    
        const newProduct = new Product({
            productName: productName.trim(),
            brand: brand.trim(),
            regularPrice: Number(regularPrice) || 0,
            salePrice: salePrice ? Number(salePrice) : null,
            description: description.trim(),
            Category: resolvedCategoryId, 
            productImage: imagePaths,
            
            variants: finalVariantsArray, 
            totalQuantity: globalTotalStockCount, 
            status: globalTotalStockCount > 0 ? 'In Stock' : 'Out of Stock',
            isListed: true,
            countryOfOrigin: countryOfOrigin ? countryOfOrigin.trim() : "India",
            material: material ? material.trim() : "Leather",
            closureType: closureType ? closureType.trim() : "Lace up",
            soleType: soleType ? soleType.trim() : "Rubber",
            weight: weight ? String(weight).trim() : "300g" 
        });

        await newProduct.save();
        
        req.flash('success', 'Product saved successfully with all custom specifications and variants!');
        res.redirect('/admin/products');

    } catch (error) {
        console.error("❌ PRODUCT CREATION FAILED:", error.message);
        req.flash('error', `Failed to save product: ${error.message}`);
        res.redirect('/admin/products');
    }
};

export const postEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, brand, regularPrice, salePrice, description, countryOfOrigin, material, closureType, soleType, weight } = req.body;

        const updateData = {
            productName, brand, regularPrice, salePrice, description, 
            countryOfOrigin, material, closureType, soleType, weight
        };

        if (req.files && req.files.length > 0) {
            updateData.productImage = req.files.map(file => file.filename);
        }

        await Product.findByIdAndUpdate(productId, updateData, { new: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Dashboard alteration error:", error);
        res.status(500).send("Processing adjustments update failure exception.");
    }
};


export const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found.');
            return req.session.save(() => res.redirect('/admin/products'));
        }

        product.isListed = !product.isListed;
        await product.save();

        const statusText = product.isListed ? 'Listed' : 'Unlisted';
        req.flash('success', `${product.productName} has been ${statusText.toLowerCase()}.`);
        
        return req.session.save((err) => {
            if (err) {
                console.error("❌ Session Save Error during product toggle:", err);
            }
            res.redirect('/admin/products');
        });

    } catch (error) {
        console.error("❌ TOGGLE STATUS FAILED:", error.message);
        req.flash('error', 'Failed to update product status.');
        
        return req.session.save(() => res.redirect('/admin/products'));
    }
};

export const postAddCategory = async (req, res) => {
    try {
        const { 
            categoryName, 
            description, 
            parentCategory, 
            childCategory, 
            discountValue 
        } = req.body;

        if (!categoryName || categoryName.trim() === "") {
            req.flash('error', 'Category name is required.');
            return res.redirect('/admin/categories');
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
            parentCategory: parentCategory || null
        });

        if (existingCategory) {
            req.flash('error', 'Category already exists.');
            return res.redirect('/admin/categories');
        }

        const newCategory = new Category({
            name: categoryName.trim(),
            description: description ? description.trim() : "",
            parentCategory: parentCategory || null,
            childCategory: childCategory ? childCategory.trim() : "",
            isListed: true,
            offer: {
                discountValue: discountValue ? parseInt(discountValue) : 0,
                offerType: 'Percentage',
                isActive: discountValue && parseInt(discountValue) > 0 ? true : false
            }
        });

        await newCategory.save();
        req.flash('success', 'New Category added successfully!');
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Add Category Error:", error);
        req.flash('error', 'Internal Server Error while saving category.');
        res.redirect('/admin/categories');
    }
};

export const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
       
        const { categoryName, description, parentCategory, discountValue } = req.body;

        if (!categoryName || !categoryName.trim() || !description || !description.trim()) {
            req.flash('error', 'Category name and description fields are required.');
            return res.redirect('/admin/categories');
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { 
                name: categoryName.trim(), 
                description: description.trim(),
                parentCategory: parentCategory || null,
                offer: {
                    discountValue: discountValue ? parseInt(discountValue) : 0,
                    offerType: 'Percentage',
                    isActive: discountValue && parseInt(discountValue) > 0 ? true : false
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            req.flash('error', 'Category not found.');
            return res.redirect('/admin/categories');
        }

        req.flash('success', `Category ${categoryName} is updated`);
        
        return req.session.save((err) => {
            if (err) console.error("Session saving error:", err);
            res.redirect('/admin/categories');
        });

    } catch (error) {
        console.error("Error updating category:", error);
        
        if (error.code === 11000) {
            req.flash('error', 'A category with this name already exists.');
        } else {
            req.flash('error', 'Internal Server Error while saving category changes.');
        }
        
        return req.session.save(() => res.redirect('/admin/categories'));
    }
};