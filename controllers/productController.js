import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as productService from '../services/productService.js';
import * as wishlistService from "../services/wishlistService.js";
import { attachOfferPricing } from '../services/productService.js';


/* ---------------- SHOP ---------------- */

export const getShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;

        const activeCategory = Array.isArray(req.query.category) 
                                    ? req.query.category 
                                    : (req.query.category ? [req.query.category] : []);
        const activePrice = req.query.price || 'all';
        const activeBrand = req.query.brand || null;
        const activeSort = req.query.sort || null;
        const activeMaterial = req.query.material || null;

        const [shopData, latestSellersRaw] = await Promise.all([
            productService.getShopProducts(req, null, page),
            productService.getLatestSellers()
        ]);

        let activeProducts = [];
        if (shopData.products && Array.isArray(shopData.products)) {
            activeProducts = shopData.products.filter(
                p => p.isListed !== false && p.isBlocked !== true
            );
        }

        const userId = req.session?.user?.id;
        let wishlistedProductIds = new Set();

        if (userId) {
            const wishlist = await wishlistService.getWishlist(userId);
            if (wishlist && wishlist.items) {
                wishlist.items.forEach(item => {
                    const id = item.productId?._id || item.productId;
                    if (id) wishlistedProductIds.add(id.toString());
                });
            }
        }

        const productsWithWishlist = activeProducts.map(product => ({
            ...product,
            isWishlisted: wishlistedProductIds.has(product._id.toString())
        }));

        const latestSellersWithWishlist = await Promise.all(latestSellersRaw.map(async (product) => {
            const enriched = await attachOfferPricing(product);
            return {
                ...enriched,
                isWishlisted: wishlistedProductIds.has(product._id.toString())
            };
        }));

        const subcategoriesOnly = shopData.categories.filter(cat => cat.parentCategory !== null);

        return res.render('user/shop', {
            ...shopData,      
            products: productsWithWishlist, 
            latestSellers: latestSellersWithWishlist,      
            searchValue: req.query.search || "",
            categories: subcategoriesOnly,  
            brands: shopData.brands,        
            materials: shopData.materials,
            activeCategory,
            activePrice,
            activeBrand,
            activeSort,
            activeMaterial,
            queryParams: req.query
        });

    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error', { 
            message: "We encountered an issue loading the shop. Please try again later." 
        });
    }
};

/* ---------------- PRODUCT DETAIL ---------------- */

export const getProductId = async (req, res) => {
    try {
        const result = await productService.getProductDetails(req.params.id);

        if (!result || !result.product || result.product.isListed === false || result.product.isBlocked === true) {
            req.flash('error', 'The product you are looking for is no longer available.');
            return req.session.save(() => {
                res.redirect('/shop');
            });
        }

        if (result.relatedProducts && Array.isArray(result.relatedProducts)) {
            result.relatedProducts = result.relatedProducts.filter(
                p => p.isListed !== false && p.isBlocked !== true
            );
        }

        let isWishlisted = false;

        if (req.session.user) {
            const userWishlist = await wishlistService.getWishlist(req.session.user.id);
            if (userWishlist && userWishlist.items) {
                isWishlisted = userWishlist.items.some(item => {
                    const pId = item.productId?._id || item.productId;
                    return pId && pId.toString() === result.product._id.toString();
                });
            }
        }

        return res.render('user/productPage', {
            ...result,
            user: req.session.user || null,
            isWishlisted
        });

    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

/* ---------------- ADMIN CONTROLLERS (Unchanged) ---------------- */

export const getAddProduct = async (req, res) => {
   try {
      const data = await productService.getAddProductPage();
      res.render('admin/add-product', data);
   } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(`Add Product Page Error: ${error.message}`);
   }
};


export const getEditProduct = async (req, res) => {
   try {
      const data = await productService.getEditProductPage(req.params.id);

      res.render('admin/edit-product', {
         ...data,
         activePage: 'products'
      });
   } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
   }
};


export const postAddProduct = async (req, res) => {
   try {
      const structuredFiles = {};
      if (Array.isArray(req.files)) {
          req.files.forEach(file => {
              if (!structuredFiles[file.fieldname]) {
                  structuredFiles[file.fieldname] = [];
              }
              structuredFiles[file.fieldname].push(file);
          });
      }

      await productService.createProduct(
         req.body,
         structuredFiles
      );

      req.flash('success', 'Product saved successfully!');
    
      req.session.save(() => {
          res.redirect('/admin/products');
      });

   } catch (error) {
    console.log("Add product Error:",error);
      req.flash('error', error.message || 'Failed to save product');
      
      req.session.save(() => {
          res.redirect('/admin/products'); 
      });
   }
};

export const postEditProduct = async (req, res) => {
    try {
        const structuredFiles = {};
        if (Array.isArray(req.files)) {
            req.files.forEach(file => {
                if (!structuredFiles[file.fieldname]) {
                    structuredFiles[file.fieldname] = [];
                }
                structuredFiles[file.fieldname].push(file);
            });
        }

        await productService.updateProduct(
            req.params.id,
            req.body,
            structuredFiles
        );

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            req.flash("success", "Product updated successfully");
            return res.json({ success: true, redirectUrl: '/admin/products' });
        }

        req.flash("success", "Product updated successfully");
        return req.session.save(() => {
            return res.redirect('/admin/products');
        });

    } catch (error) { 
        if (error.fieldErrors) {
            if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['sec-fetch-mode'] === 'cors') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    errors: error.fieldErrors
                });
            }

            const editPageData = await productService.getEditProductPage(req.params.id);

            const reconstructedVariants = editPageData.product.variants.map((dbVariant, i) => {
                const inputSizes = req.body[`sizes_${i}`] || req.body[`sizes_${i}[]`];
                const inputStocks = req.body[`stocks_${i}`] || req.body[`stocks_${i}[]`];
                
                let sizes = dbVariant.sizes;
                if (inputSizes) {
                    const sizesArr = Array.isArray(inputSizes) ? inputSizes : [inputSizes];
                    const stocksArr = Array.isArray(inputStocks) ? inputStocks : [inputStocks];
                    sizes = sizesArr.map((sz, idx) => ({
                        size: Number(sz),
                        stock: Number(stocksArr[idx]) || 0
                    })).filter(s => s.size > 0);
                }

                return {
                    ...dbVariant,
                    colorName: req.body.colorNames?.[i] || dbVariant.colorName,
                    colorHex: req.body.colorHex?.[i] || dbVariant.colorHex,
                    sizes: sizes.length > 0 ? sizes : dbVariant.sizes
                };
            });

            return res.render('admin/edit-product', {
                isAdmin: true,
                activePage: 'products',
                product: { 
                    ...editPageData.product, 
                    ...req.body, 
                    _id: req.params.id,
                    variants: reconstructedVariants
                }, 
                parentCategories: editPageData.parentCategories,
                subcategories: editPageData.subcategories,
                brands: editPageData.brands,
                selectedParentId: req.body.parentCategory || editPageData.selectedParentId,
                fieldErrors: error.fieldErrors
            });
        }

        if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['sec-fetch-mode'] === 'cors') {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || "Something went wrong" });
        }

        req.flash("error", error.message || "Something went wrong");
        return req.session.save(() => {
            return res.redirect(`/admin/products/edit/${req.params.id}`);
        });
    }
};


export const getProducts = async (req, res) => {
   try {
       const data = await productService.getProductsPage(req.query);
      
       res.render('admin/product', data);
   } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
   }
};


export const toggleProductStatus = async (req, res) => {
   try {
      const result = await productService.toggleProductStatus(req.params.id);

      req.flash('success', result.message);
      req.session.save(() => {
         res.redirect('/admin/products');
      });

   } catch (error) {
      req.flash('error', error.message);
      req.session.save(() => {
         res.redirect('/admin/products');
      });
   }
};

