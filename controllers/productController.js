import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as productService from '../services/productService.js';
import * as wishlistService from "../services/wishlistService.js";

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

        const attachOfferPricing = (product) => {
            let discount = 0;
            
            if (product.offer && product.offer.isActive) {
                discount = product.offer.discountValue;
            } 
            else if (product.Category && product.Category.offer && product.Category.offer.isActive) {
                discount = product.Category.offer.discountValue;
            }

            const hasOffer = discount > 0;
            const salePrice = hasOffer 
                ? Math.round(product.regularPrice * (1 - discount / 100)) 
                : product.regularPrice;

            return {
                ...product,
                isWishlisted: wishlistedProductIds.has(product._id.toString()),
                hasOffer,
                salePrice,
                regularPrice: product.regularPrice
            };
        };

        const productsWithWishlist = activeProducts.map(attachOfferPricing);
        const latestSellersWithWishlist = latestSellersRaw.map(attachOfferPricing);

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
        console.error("Product Details routing error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};

/* ---------------- ADMIN CONTROLLERS (Unchanged) ---------------- */

export const getAddProduct = async (req, res) => {
   try {
      const data = await productService.getAddProductPage();
      res.render('admin/add-product', data);
   } catch (error) {
      console.error(error);
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
      console.error(error);
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
      console.error("ADD PRODUCT VALIDATION ERROR:", error.message);
      
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

      req.flash("success", "Product updated successfully");
      
      req.session.save(() => {
          return res.redirect('/admin/products');
      });

   } catch (error) {
      console.error("EDIT PRODUCT VALIDATION ERROR:", error.message);
      
      req.flash("error", error.message || "Something went wrong");
      
      req.session.save(() => {
          return res.redirect(`/admin/products/edit/${req.params.id}`);
      });
   }
};


export const getProducts = async (req, res) => {
   try {

      const data = await productService.getProductsPage(req.query);
      
      res.render('admin/product', data);
   } catch (error) {
      console.error(error);
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

