const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: false, // disabled to not break inline scripts/styles
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP
    message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Install Interceptor
global.needsInstall = process.env.INSTALL_COMPLETED !== 'true';

app.use((req, res, next) => {
    if (global.needsInstall) {
        if (req.path.startsWith('/install') || req.path.startsWith('/theme-assets') || req.path.startsWith('/css') || req.path.startsWith('/js')) {
            return next();
        }
        return res.redirect('/install');
    }
    next();
});

// Install Route
app.use('/install', require('./routes/install'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'themes'));

// Set static folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve theme assets
app.use('/theme-assets/:theme', (req, res, next) => {
    express.static(path.join(__dirname, 'themes', req.params.theme, 'assets'))(req, res, next);
});

const themeMiddleware = require('./middleware/theme');

// Apply Theme Middleware
app.use(themeMiddleware);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api/themes', require('./routes/api-theme'));

// Frontend Routes
app.use('/', require('./routes/frontend'));

// Define PORT
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
