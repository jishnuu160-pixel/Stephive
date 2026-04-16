import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import session from 'express-session';
import { connectDB } from './config/db.js';

import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import homeRoutes from './routes/homeRoutes.js';

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
    res.locals.user = req.session.user || null;
    next();
});

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', homeRoutes);

app.get('/login',(req,res)=>{
    res.render('user/login');
});

app.get('/signup',(req,res)=>{
    res.render('user/signup');
});

export default app;