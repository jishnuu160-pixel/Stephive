import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';

import dotenv from "dotenv";
dotenv.config();

import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import productRoutes from './routes/productRoutes.js';
import passport  from './config/passport.js';
import * as cartService from './services/cartService.js';
import { type } from 'os';


const app = express();


app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(process.cwd(), 'views/layouts'),
    partialsDir: [
        path.join(process.cwd(), 'views/partials'),      
        path.join(process.cwd(), 'views/admin/partials') 
    ],
    helpers: {
   eq: (a, b) => a?.toString() === b?.toString(),
    add: (a, b, c) => a + b + c,
    subtract: (a, b) => (a || 0) - (b || 0),
    multiply: (a, b) => (a || 0) * (b || 0),
    json: (context) => {
            return JSON.stringify(context, null, 2);
        },
    toLowerCase: (str) =>
        (typeof str === 'string' ? str.toLowerCase() : ''),
    firstVariantSizes: (variants) => {
        if (
            Array.isArray(variants) &&
            variants.length > 0 &&
            Array.isArray(variants[0].sizes)
        ) {
            return variants[0].sizes;
        }
        return [];
    },
    firstVariant: (variants) => {
        if (
            Array.isArray(variants) &&
            variants.length > 0
        ) {
            return variants[0];
        }
        return null;
    },
    toString: function(value) {
    return value.toString();
},
  toUpperCase: (str) =>
    (typeof str === 'string' ? str.toUpperCase() : '')  
}
}));



app.set('view engine', 'hbs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/uploads/profile_pics', express.static(path.join(process.cwd(),'public', 'uploads', 'profile_pics')));

app.use('/uploads', express.static(path.join(process.cwd(),'public', 'uploads', 'products')));


app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(session({
    name:'user_session',
    secret: process.env.SESSION_SECRET || 'stephive_secret_key',
    resave: false,               
    saveUninitialized: false,    
    rolling: false,              
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true        
    }
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());



app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const flashError = req.flash('error');
    const flashSuccess = req.flash('success');

    res.locals.error = req.query.error || (flashError.length > 0 ? flashError : null);
    res.locals.success = req.query.success || (flashSuccess.length > 0 ? flashSuccess : null);

    if (!req.path.startsWith('/admin')) {
        res.locals.user = req.session.user || req.user || null;
    } else {
        res.locals.user = null; 
    }

    res.locals.admin = req.session.admin || null; 
    
    next();
});

app.use(async (req, res, next) => {
    try {
        if (req.session && req.session.user && req.session.user.id) {
            const userId = req.session.user.id;
            
            const { totalUnitsCount } = await cartService.getCartPageData(userId);
            
            res.locals.globalCartCount = totalUnitsCount;
        } else {
            res.locals.globalCartCount = 0;
        }
    } catch (error) {
        console.error("Error updating global header badge count:", error);
        res.locals.globalCartCount = 0;
    }
    next();
});

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', homeRoutes);
app.use('/',productRoutes);
app.use('/user/cart', cartRoutes);

export default app;