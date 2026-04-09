import * as userService from '../services/userService.js';

export const getSignup = (req, res) => {
    res.render('user/signup'); // ✅ fixed
};

export const postSignup = async (req, res) => {
    try {
        await userService.signup(req.body);
        res.redirect('/user/login');
    } catch (err) {
        res.send(err.message);
    }
};

export const getLogin = (req, res) => {
    res.render('user/login', {
        error: req.query.error,
        success: req.query.success
    }); // ✅ fixed (removed 'n')
};

export const postLogin = async (req, res) => {
    try {
        await userService.login(req.body);

        res.redirect('/user/login?success=Login successful'); // ✅ fixed

    } catch (err) {
        res.redirect('/user/login?error=' + encodeURIComponent(err.message)); // ✅ fixed
    }
};