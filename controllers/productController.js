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