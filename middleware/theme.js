const Setting = require('../models/setting');
const Page = require('../models/page');
const themeEngine = require('../core/theme-engine');
const crypto = require('crypto');

module.exports = async function themeMiddleware(req, res, next) {
    // Only apply to frontend routes
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
        return next();
    }

    try {
        // Get site settings
        const siteSettings = await Setting.getAll();
        const activeTheme = siteSettings.active_theme || 'sea-foam';
        
        // Generate dynamic CSS variables and get full config
        const customCss = await themeEngine.generateCustomCssVars(activeTheme);
        const themeConfig = await Setting.getThemeSettings(activeTheme);
        const themeDef = themeEngine.getThemeDefinition(activeTheme) || { customizable: {} };
        
        // Merge DB overrides with defaults
        const finalThemeConfig = {};
        for (const [key, config] of Object.entries(themeDef.customizable)) {
            let val = themeConfig[key] !== undefined ? themeConfig[key] : config.default;
            if (config.type === 'boolean') {
                // SQLite might return 'false', '0', 0, 'true', '1', 1
                val = val === 'true' || val === true || val === '1' || val === 1;
            } else if (config.type === 'range') {
                val = parseInt(val, 10);
            }
            finalThemeConfig[key] = val;
        }

        // Fetch nav pages
        const navPages = await Page.findNavPages();

        // Compute Author Profile
        const mode = siteSettings.avatar_mode || 'text';
        let computedAvatar = '';
        const authorName = siteSettings.author_name || 'Admin';
        if (mode === 'custom' && siteSettings.avatar_custom_url) {
            computedAvatar = siteSettings.avatar_custom_url;
        } else if (mode === 'gravatar' && siteSettings.admin_email) {
            const hash = crypto.createHash('md5').update(siteSettings.admin_email.trim().toLowerCase()).digest('hex');
            computedAvatar = `https://www.gravatar.com/avatar/${hash}?s=100&d=identicon`;
        } else {
            computedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0ea5e9&color=fff&size=100`;
        }
        siteSettings.computed_avatar = computedAvatar;
        siteSettings.computed_author_name = authorName;
        siteSettings.computed_author_bio = siteSettings.author_bio || '热爱代码与生活的创造者。';

        // Bind helpers to res.locals for EJS views
        res.locals.site = siteSettings;
        res.locals.theme = activeTheme;
        res.locals.customCssVars = customCss;
        res.locals.themeConfig = finalThemeConfig;
        res.locals.navPages = navPages;
        
        // Helper function for rendering the right template
        res.renderTheme = (templateName, data = {}) => {
            const templatePath = themeEngine.getTemplatePath(activeTheme, templateName);
            const renderData = {
                ...res.locals,
                ...data
            };
            res.render(templatePath, renderData);
        };

        next();
    } catch (err) {
        console.error('Theme middleware error:', err);
        next(err);
    }
};
