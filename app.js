// app.js
import express from 'express';
import path from 'path';
import session from 'express-session';
import nocache from 'nocache';
import { fileURLToPath } from 'url';

import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';

// 🔧 Fix __dirname in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ SESSION FIRST
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

// ✅ PREVENT CACHING (custom headers)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ✅ PREVENT CACHING (nocache middleware)
app.use(nocache());

// ✅ BODY PARSERS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ VIEW ENGINE
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// ✅ STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// ✅ LANDING PAGE
app.get('/', (req, res) => {
  res.render('select-role');
});

// ✅ ROUTES
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// ✅ IMPORTANT: DEFAULT EXPORT
export default app;
