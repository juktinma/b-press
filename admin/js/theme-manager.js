class ThemeManager {
    async render(root) {
        this.root = root;
        this.root.innerHTML = `<div class="page-header"><h2>外观主题</h2></div><div id="theme-loading">加载中...</div>`;
        
        try {
            // Fetch all themes
            this.themes = await api.get('/themes');
            // Fetch global settings to get active theme
            this.settings = await api.get('/settings');
            this.activeSlug = this.settings.active_theme || 'sea-foam';
            
            this.renderUI();
        } catch (e) {
            this.root.innerHTML += `<p style="color:red">加载主题失败</p>`;
        }
    }

    renderUI() {
        const activeTheme = this.themes.find(t => t.slug === this.activeSlug);
        
        let html = `
            <div style="display:flex; gap: 30px;">
                <div style="flex:1;">
                    <h3>当前主题: ${activeTheme ? activeTheme.name : this.activeSlug}</h3>
                    <p style="color:var(--admin-text-muted); margin-bottom: 20px;">${activeTheme ? activeTheme.description : ''}</p>
                    
                    <div class="table-wrapper" style="padding: 20px;" id="customizer-panel">
                        <h4>主题自定义</h4>
                        <div id="customizer-form" style="margin-top: 20px;">加载中...</div>
                    </div>
                </div>
                
                <div style="flex:1;">
                    <h3>已安装的主题</h3>
                    <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
                        ${this.themes.map(t => `
                            <div class="table-wrapper" style="padding:15px; display:flex; justify-content:space-between; align-items:center; border-color: ${t.slug === this.activeSlug ? 'var(--admin-primary)' : 'var(--admin-border)'}">
                                <div>
                                    <strong style="font-size:1.1rem">${t.name}</strong> v${t.version}
                                    <div style="color:var(--admin-text-muted); font-size:0.9rem">${t.author}</div>
                                </div>
                                ${t.slug !== this.activeSlug ? `<button class="btn" onclick="themeManager.activateTheme('${t.slug}')">启用</button>` : `<span style="color:var(--admin-primary); font-weight:bold;">已启用</span>`}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.root.innerHTML = `<div class="page-header"><h2>外观主题</h2></div>` + html;
        
        if (activeTheme && activeTheme.customizable) {
            this.renderCustomizer(activeTheme);
        } else {
            document.getElementById('customizer-form').innerHTML = '<p>该主题不支持自定义设置。</p>';
        }
    }

    async renderCustomizer(theme) {
        const container = document.getElementById('customizer-form');
        this.currentTheme = theme;
        this.pendingOverrides = await api.get(`/themes/${theme.slug}/settings`) || {};
        
        let html = '';
        for (const [key, config] of Object.entries(this.currentTheme.customizable)) {
            const val = this.pendingOverrides[key] !== undefined ? this.pendingOverrides[key] : config.default;
            
            if (config.type === 'color') {
                html += `
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>${config.label}</span>
                        <span id="val_${key}" style="color:var(--text-muted);">${val}</span>
                    </label>
                    <input type="color" data-key="${key}" class="theme-input" value="${val}" style="width:100%; height:40px; border:none; background:none; cursor:pointer;">
                </div>`;
            } else if (config.type === 'range') {
                html += `
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>${config.label}</span>
                        <span id="val_${key}" style="color:var(--text-muted);">${val}</span>
                    </label>
                    <input type="range" data-key="${key}" class="theme-input" value="${val}" min="${config.min}" max="${config.max}" style="width:100%;">
                </div>`;
            } else if (config.type === 'boolean') {
                const isChecked = val === 'true' || val === true || val === '1' || val === 1;
                html += `
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${config.label}</span>
                        <input type="checkbox" data-key="${key}" class="theme-input" ${isChecked ? 'checked' : ''} style="width:20px; height:20px;">
                    </label>
                </div>`;
            } else if (config.type === 'select') {
                const optionsHtml = config.options.map(opt => `<option value="${opt.value}" ${val === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
                html += `
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px;">${config.label}</label>
                    <select data-key="${key}" class="theme-input form-control">
                        ${optionsHtml}
                    </select>
                </div>`;
            } else if (config.type === 'textarea') {
                html += `
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px;">${config.label}</label>
                    <textarea data-key="${key}" class="theme-input form-control" style="width:100%; min-height:120px; font-size:14px; padding:10px;">${val}</textarea>
                </div>`;
            }
        }

        html += `
            <div style="margin-top:30px; display:flex; gap:15px;">
                <button class="btn" onclick="themeManager.saveSettings('${theme.slug}')">保存自定义</button>
                <button class="action-btn danger" onclick="themeManager.resetSettings('${theme.slug}')">恢复默认</button>
            </div>
        `;
        container.innerHTML = html;
        this.bindEvents();
    }

    bindEvents() {
        const inputs = document.querySelectorAll('.theme-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const key = e.target.dataset.key;
                let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                const config = this.currentTheme.customizable[key];
                
                // Update label if it's color or range
                const valLabel = document.getElementById(`val_${key}`);
                if (valLabel) valLabel.innerText = val;

                if (config.type === 'range') val = parseInt(val);

                // Save to object
                this.pendingOverrides[key] = val;

                // Live preview CSS variables only
                if (config.type === 'color' || config.type === 'range') {
                    const cssVarName = '--' + key.replace(/_/g, '-');
                    let cssVal = val;
                    if (config.type === 'range') cssVal = val + 'px';
                    
                    const previewFrame = document.getElementById('theme-preview');
                    if (previewFrame && previewFrame.contentWindow) {
                        previewFrame.contentWindow.document.documentElement.style.setProperty(cssVarName, cssVal);
                    }
                }
            });
        });
    }

    async saveSettings(slug) {
        await api.put(`/themes/${slug}/settings`, this.pendingOverrides);
        alert('主题设置已保存！前台已生效。');
    }

    async resetSettings(slug) {
        if(confirm('确定要恢复该主题的所有默认设置吗？')) {
            await api.post(`/themes/${slug}/reset`);
            this.render(this.root);
            alert('已恢复默认。');
        }
    }

    async activateTheme(slug) {
        await api.put('/settings', { active_theme: slug });
        this.render(this.root);
    }
}

window.themeManager = new ThemeManager();
