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
import passport  from './config/passport.js';


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
        eq: (a, b) => a === b,
        add: (a,b,c) =>  a+b+c
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/uploads',express.static(path.join(process.cwd(), 'public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(session({
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

    // 🟢 BETTER SEPARATION
    // Only assign req.user to res.locals.user if it's NOT an admin path
    if (!req.path.startsWith('/admin')) {
        res.locals.user = req.session.user || req.user || null;
    } else {
        res.locals.user = null; // Ensure User data doesn't bleed into Admin views
    }

    res.locals.admin = req.session.admin || null; 
    
    next();
});

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', homeRoutes);


export default app;