
export const getHome = (req, res) => {
    res.render('home', {
        isHome: true,
        user: req.session.user || null // Pass the session user here
    });
};