const fs = require('fs');
const path = require('path');
const Setting = require('../models/setting');

class ThemeEngine {
    constructor() {
        this.themesDir = path.join(__dirname, '../themes');
    }

    // Get all installed themes
    getAvailableThemes() {
        const themes = [];
        if (!fs.existsSync(this.themesDir)) return themes;

        const folders = fs.readdirSync(this.themesDir);
        for (const folder of folders) {
            const themeJsonPath = path.join(this.themesDir, folder, 'theme.json');
            if (fs.existsSync(themeJsonPath)) {
                try {
                    const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
                    themes.push(themeData);
                } catch (e) {
                    console.error(`Failed to parse theme.json for theme ${folder}`, e);
                }
            }
        }
        return themes;
    }

    // Get a specific theme definition
    getThemeDefinition(slug) {
        const themes = this.getAvailableThemes();
        return themes.find(t => t.slug === slug) || null;
    }

    // Generate CSS Variables for a theme based on defaults and DB overrides
    async generateCustomCssVars(themeSlug) {
        const themeDef = this.getThemeDefinition(themeSlug);
        if (!themeDef || !themeDef.customizable) return '';

        // Get overrides from DB
        const overrides = await Setting.getThemeSettings(themeSlug);

        let css = ':root {\n';
        for (const [key, config] of Object.entries(themeDef.customizable)) {
            // Convert underscore_key to --kebab-case (basic mapping)
            const cssVarName = '--' + key.replace(/_/g, '-');
            const value = overrides[key] !== undefined ? overrides[key] : config.default;
            
            // Add px if it's a range without unit in value
            let finalValue = value;
            if (config.type === 'range' && typeof value === 'number') {
                finalValue = `${value}px`;
            }
            
            css += `    ${cssVarName}: ${finalValue};\n`;
        }
        css += '}';
        return css;
    }

    // Get the template path string relative to views directory
    getTemplatePath(themeSlug, templateName) {
        // Prevent path traversal
        const safeTemplateName = path.basename(templateName || 'page');
        // EJS looks for views relative to app.set('views') which is /themes
        return `${themeSlug}/views/${safeTemplateName}`;
    }
}

module.exports = new ThemeEngine();
