
export const getHome = (req, res) => {
    res.render('home', {
        isHome: true,
        activePage:'home',
        user: req.session.user || null 
    });
};