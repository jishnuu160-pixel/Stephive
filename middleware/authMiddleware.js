export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return next();
    } else {
        res.redirect('/user/login');
    }
};

export const isLoggedOut = (req, res, next) => {
    if (req.session && req.session.user) {
        const backURL = req.header('Referer') || '/'; 
        return res.redirect(backURL); 
    }
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
};


export const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1
    res.setHeader('Pragma', 'no-cache'); // HTTP 1.0
    res.setHeader('Expires', '0'); // Proxies
    next();
};