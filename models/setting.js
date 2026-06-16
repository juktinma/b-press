const db = require('../config/db');

class Setting {
    static async get(key) {
        const [rows] = await db.query('SELECT value FROM settings WHERE `key` = ?', [key]);
        return rows.length ? rows[0].value : null;
    }

    static async set(key, value) {
        await db.query(
            'REPLACE INTO settings (`key`, `value`) VALUES (?, ?)',
            [key, value]
        );
    }

    static async getAll() {
        const [rows] = await db.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        return settings;
    }

    // Theme Settings
    static async getThemeSettings(themeSlug) {
        const [rows] = await db.query('SELECT `key`, `value` FROM theme_settings WHERE theme_slug = ?', [themeSlug]);
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        return settings;
    }

    static async setThemeSetting(themeSlug, key, value) {
        await db.query(
            'REPLACE INTO theme_settings (theme_slug, `key`, `value`) VALUES (?, ?, ?)',
            [themeSlug, key, value]
        );
    }

    static async resetThemeSettings(themeSlug) {
        await db.query('DELETE FROM theme_settings WHERE theme_slug = ?', [themeSlug]);
    }
}

module.exports = Setting;
