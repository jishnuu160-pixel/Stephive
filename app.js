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
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import referralRoutes from './routes/referralRoutes.js';

import {  injectNavbarData } from'./middleware/authMiddleware.js';
import passport from './config/passport.js';
import { initExpiryCron } from './utils/cronHelper.js';

const app = express();

app.engine('hbs',engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(process.cwd(),'views/layouts'),
    partialsDir: [
        path.join(process.cwd(),'views/partials'),      
        path.join(process.cwd(),'views/admin/partials') 
    ],
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
helpers: {
    addParams: function(query, page) {
    let params=new URLSearchParams(query);
    params.set('page',page); 
    return '?'+params.toString();
    },
    hyphenate: (text)=>{
        return typeof text === 'string'? text.toLowerCase().replace(/\s+/g,'-'):'';
    },
    ifEquals: (arg1,arg2,options)=>{
    return arg1===arg2?options.fn(this): options.inverse(this);
    },
    isStepVisible: (stepRank,currentStatus) => {
    const ranks = {
        'Order Placed':0,
        'Processing at Atelier':1,
        'Shipped':2,
        'Out of delivery':3,
        'Delivered':4
    };
    return stepRank<=(ranks[currentStatus]??4); 
    },
    statusClass: function(status) {
        if(!status) return 'badge-secondary';
        
        switch (status.toLowerCase().trim()) {
            case 'delivered':
                return 'badge-success'; 
            case 'pending':
            case 'processing':
            case 'placed':
                return 'badge-warning'; 
            case 'shipped':
            case 'out of delivery':
                return 'badge-info';
            case 'cancelled':
            case 'returned':
                return 'badge-danger'; 
            default:
                return 'badge-secondary'; 
        }
    },
    lt: ((a , b) => a < b),
    gt: ((a , b) => b > a),
    le: ((a , b) => a <= b),
    ge: ((a , b) => a >= b),
    eq: ((a , b) => a?.toString() === b?.toString()),
    or: ((a , b) => a||b),
    includes: (array, value) => {
            if(!array) return false;
            if(Array.isArray(array)) {
                return array.map(item=>item.toString()).includes(value?.toString());
            }
            return array.toString()===value?.toString();
       },
    add: (a , b , c) => ( a || 0 ) + ( b || 0 ) + ( c || 0 ),
    subtract: (a , b)=>( a || 0 ) - ( b || 0),
    multiply: (a , b)=>( a || 0) * ( b || 0 ),
    json: (context)=>{
            return JSON.stringify(context, null, 2);
        },
    toLowerCase: (str)=>
        (typeof str==='string' ? str.toLowerCase():''),
    formattedDate: function(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        },
    formattedTime: function(date){
            if (!date) return '';
            return new Date(date).toLocaleTimeString('en-IN',{
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
    },    
    firstVariantSizes: (variants) => {
        if (
            Array.isArray(variants) &&
            variants.length>0 &&
            Array.isArray(variants[0].sizes)
        ) {
            return variants[0].sizes;
        }
        return [];
    },
    firstVariant: (variants)=>{
        if (
            Array.isArray(variants) &&
            variants.length>0
        ) {
            return variants[0];
        }
        return null;
    },
    toString: function(value) {
        return value? value.toString():'';
    },
    isStepCompleted: function(itemStep,currentStep) {
    return itemStep<=currentStep;
    },
    isStepActive: function(itemStep, currentStep) {
    return itemStep===currentStep;
    },
    toUpperCase: (str) =>
    (typeof str==='string'?str.toUpperCase():'') 
    ,
    concat: function(str1, str2) {
        return str1 + str2;
    },
    lookup: function(obj, field) {
        return obj && obj[field];
    },
    getError: function(errors, field, index) {
        if (!errors) return null;
        return errors[`${field}_${index}`];
    }
    }
}));

app.set('view engine','hbs');
app.set('views',path.join(process.cwd(),'views'));

app.use(express.static(path.join(process.cwd(),'public')));

app.use('/uploads/profile_pics', express.static(path.join(process.cwd(),'public', 'uploads', 'profile_pics')));

app.use('/uploads', express.static(path.join(process.cwd(),'public', 'uploads', 'products')));

app.use(express.json());
app.use(express.urlencoded({extended:true})); 

app.use(session({
    name: 'user_session',
    secret: process.env.SESSION_SECRET||'stephive_secret_key',
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

    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const isPageRequest =
        req.method === 'GET' &&
        req.accepts('html');

    if (isPageRequest) {

        const flashError = req.flash('error');
        const flashSuccess = req.flash('success');

        res.locals.error =
            req.query.error ||
            (flashError.length > 0 ? flashError : null);

        res.locals.success =
            req.query.success ||
            (flashSuccess.length > 0 ? flashSuccess : null);

    } else {
        res.locals.error = null;
        res.locals.success = null;
    }
    if (req.path.startsWith('/admin')) {
        res.locals.user = null;
    }
    res.locals.admin = req.session.admin || null;
    next();
});

app.use(injectNavbarData);

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', homeRoutes);
app.use('/', productRoutes);
app.use('/cart', cartRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/', orderRoutes);
app.use('/admin/coupons', couponRoutes);
app.use('/payment', paymentRoutes);
app.use('/', walletRoutes);
app.use('/', referralRoutes);

initExpiryCron();

export default app;