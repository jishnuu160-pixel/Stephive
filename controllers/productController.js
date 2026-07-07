import * as productService from '../services/productService.js';
import * as wishlistService from "../services/wishlistService.js";

/* ---------------- SHOP ---------------- */

export const getShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;

        const [shopData, bestSellersRaw] = await Promise.all([
            productService.getShopProducts(req, null, page),
            productService.getBestSellers()
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

        const bestSellersWithWishlist = bestSellersRaw.map(product => ({
            ...product,
            isWishlisted: wishlistedProductIds.has(product._id.toString())
        }));

        return res.render('user/shop', {
            ...shopData,      
            products: productsWithWishlist, 
            bestSellers: bestSellersWithWishlist,      
            searchValue: req.query.search || ""
        });

    } catch (error) {
        console.error("Shop Controller Error:", error);
        return res.status(500).render('error', { 
            message: "We encountered an issue loading the shop. Please try again later." 
        });
    }
};

/* ---------------- WOMEN ---------------- */

export const getWomenShopPage = async (req, res) => {
    try {
        const result = await productService.getGenderPage('women', req);
        
        if (result.noProductsFound) {
            req.flash('error', 'No products found in Women\'s section');
            return res.redirect('/shop');
        }

        if (result.products && Array.isArray(result.products)) {
            result.products = result.products.filter(p => p.isListed !== false && p.isBlocked !== true);
        }
        
        return res.render('user/gender', result);

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
};

/* ---------------- MEN ---------------- */

export const getMenShopPage = async (req, res) => {
    try {
        const result = await productService.getGenderPage('men', req);
        
        if (result.noProductsFound) {
            req.flash('error', 'No products found in Men\'s section');
            return res.redirect('/shop');
        }

        if (result.products && Array.isArray(result.products)) {
            result.products = result.products.filter(p => p.isListed !== false && p.isBlocked !== true);
        }
        
        return res.render('user/gender', result);

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
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
            isWishlisted = await wishlistService.isInWishlist(
                req.session.user.id,
                result.product._id
            );
        }

        return res.render('user/productPage', {
            ...result,
            user: req.session.user || null,
            isWishlisted
        });

    } catch (error) {
        console.error("Product Details routing error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/* ---------------- ADMIN CONTROLLERS (Unchanged) ---------------- */

export const getAddProduct = async (req, res) => {
   try {
      const data = await productService.getAddProductPage();
      res.render('admin/add-product', data);
   } catch (error) {
      console.error(error);
      return res.status(500).send(`Add Product Page Error: ${error.message}`);
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
      res.status(500).send("Internal Server Error");
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
      res.status(500).send("Internal Server Error");
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

