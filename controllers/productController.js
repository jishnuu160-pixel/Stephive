import * as productService from '../services/productService.js';

/* ---------------- SHOP ---------------- */

export const getShop = async (req, res) => {
    try {
        const result = await productService.getShopProducts(req);

        if (result.noProductsFound) {
            req.flash('error', 'No matching products found');
            return res.redirect('/shop');
        }

        if (result.redirectTo) {
            return res.redirect(result.redirectTo);
        }

        return res.render('user/shop', result);

    } catch (error) {
        console.log(error);
        return res.status(500).send(error.message);
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

        if (!result) {
            return res.status(404).render('user/404');
        }

        return res.render('user/productPage', {
            ...result,
            user: req.session.user || null
        });

    } catch (error) {
        return res.status(500).send("Internal Server Error");
    }
};


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

    req.flash('error', 'Product already exists');


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
      return res.redirect('/admin/products');

   } catch (error) {
      console.error("EDIT PRODUCT ERROR:", error.message);
      req.flash("error", error.message || "Something went wrong");
      return res.redirect(`/admin/products/edit/${req.params.id}`);
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