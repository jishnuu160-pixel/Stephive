export const isAdminAuthenticated = (req, res, next) => {
    if (req.session && req.session.admin) {
      return  next();
    } else {    
        res.redirect('/admin/login');
    }
};

export const isAdminLoggedOut = (req, res, next) => {
    if (req.session && req.session.admin) {
   
        return res.redirect('/admin/dashboard'); 
    }
   
    next();
};

export const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};