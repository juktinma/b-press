const express = require('express');
const themeEngine = require('../core/theme-engine');
const Setting = require('../models/setting');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all theme API routes
router.use(authMiddleware);

// List all installed themes
router.get('/', (req, res) => {
    const themes = themeEngine.getAvailableThemes();
    res.json(themes);
});

// Get theme settings
router.get('/:slug/settings', async (req, res) => {
    const { slug } = req.params;
    const settings = await Setting.getThemeSettings(slug);
    res.json(settings);
});

// Update theme settings
router.put('/:slug/settings', async (req, res) => {
    const { slug } = req.params;
    for (const [key, value] of Object.entries(req.body)) {
        await Setting.setThemeSetting(slug, key, value);
    }
    res.json({ success: true });
});

// Reset theme settings
router.post('/:slug/reset', async (req, res) => {
    const { slug } = req.params;
    await Setting.resetThemeSettings(slug);
    res.json({ success: true });
});

module.exports = router;
