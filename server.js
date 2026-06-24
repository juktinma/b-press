const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Timezone is dynamically set from settings, but default to UTC if not set.
// process.env.TZ will be updated when settings are loaded.

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

// CSRF Middleware
const crypto = require('crypto');
app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$/i)) {
        return next();
    }
    let csrfCookie = '';
    if (req.headers.cookie) {
        const match = req.headers.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
        if (match) csrfCookie = match[1];
    }
    if (!csrfCookie) {
        csrfCookie = crypto.randomBytes(16).toString('hex');
        res.setHeader('Set-Cookie', `csrf_token=${csrfCookie}; Path=/; SameSite=Lax`);
    }
    if (req.method === 'POST') {
        const path = req.path;
        if (path === '/comment' || path === '/api/auth/login') {
            const token = req.body._csrf || req.headers['x-csrf-token'];
            if (!token || token !== csrfCookie) {
                return res.status(403).json({ error: 'CSRF Token Invalid or Missing' });
            }
        }
    }
    res.locals.csrfToken = csrfCookie;
    next();
});

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

// Load global config
let config = {};
try {
    config = require('./config.json');
} catch (e) {
    console.warn('No config.json found or invalid format, using defaults.');
}

// Define PORT (Priority: .env -> config.json -> 3000)
const PORT = process.env.PORT || config.port || 3000;

const Setting = require('./models/setting');
Setting.getAll().then(settings => {
    if (settings.timezone) {
        process.env.TZ = settings.timezone;
    } else {
        process.env.TZ = 'Asia/Shanghai'; // default
    }
    
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
}).catch(err => {
    console.error('Failed to load settings on boot:', err);
    process.exit(1);
});
