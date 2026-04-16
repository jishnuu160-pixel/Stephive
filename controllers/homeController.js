export const getHome = (req, res) => {
    res.render('home',{isHome: true}); 
};