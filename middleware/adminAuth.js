export const isAdminAuthenticated = (req, res, next) => {
    // Check if the session exists and if the admin object is present
    if (req.session && req.session.admin) {
        next(); // Admin is logged in, proceed to the next function
    } else {
        // Not logged in as admin, redirect to admin login page
        res.redirect('/admin/login');
    }
};

// This prevents logged-in users from seeing the login page
export const isLoggedOut = (req, res, next) => {
    if (req.session && req.session.admin) {
        // 🟢 If session exists, they are already logged in
        return res.redirect('/admin/dashboard'); 
    }
    // 🟢 No session? Proceed to the login page
    next();
};

export const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};