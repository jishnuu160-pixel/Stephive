import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import session from 'express-session';
import { connectDB } from './config/db.js';

import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import passport  from './config/passport.js';

const app = express();

connectDB();

app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(process.cwd(), 'views/layouts'),
    partialsDir: [
        path.join(process.cwd(), 'views/partials'),      
        path.join(process.cwd(), 'views/admin/partials') 
    ],
    helpers: {
        eq: (a, b) => a === b,
        addOne: (value) => value + 1
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/uploads',express.static(path.join(process.cwd(), 'public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false, 
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});


app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'], 
        prompt: 'select_account' 
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    (req, res) => {
        req.session.user = {
            id: req.user._id,
            name: req.user.fullName,
            email: req.user.email,
            profileImage: req.user.profileImage
        };

       
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.redirect('/user/login');
            }
            console.log("Session saved successfully for:", req.user.email);
            res.redirect('/'); 
        });
    }
);


app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', homeRoutes);


export default app;