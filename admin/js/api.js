// api.js - Centralized fetch wrapper for admin panel
class Api {
    constructor() {
        this.token = localStorage.getItem('adminToken');
    }

    async request(endpoint, method = 'GET', body = null) {
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(`/api${endpoint}`, options);
            if (res.status === 401) {
                localStorage.removeItem('adminToken');
                window.location.href = 'login.html';
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    }

    get(endpoint) { return this.request(endpoint, 'GET'); }
    post(endpoint, data) { return this.request(endpoint, 'POST', data); }
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); }
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }

    async uploadImage(file) {
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            if (res.status === 401) {
                localStorage.removeItem('adminToken');
                window.location.href = 'login.html';
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error('Upload Error:', err);
            throw err;
        }
    }
}

const api = new Api();

// Global Admin Theme Applier
window.applyAdminTheme = function(settings) {
    const root = document.documentElement;
    if (settings.admin_theme_mode === 'dark') {
        root.style.setProperty('--admin-bg', '#0f172a');
        root.style.setProperty('--admin-sidebar', '#1e293b');
        root.style.setProperty('--admin-card', '#1e293b');
        root.style.setProperty('--admin-text', '#f8fafc');
        root.style.setProperty('--admin-text-muted', '#94a3b8');
        root.style.setProperty('--admin-border', '#334155');
        // Update input backgrounds
        const style = document.getElementById('admin-dynamic-style') || document.createElement('style');
        style.id = 'admin-dynamic-style';
        style.innerHTML = `.form-control { background: #0f172a !important; color: white !important; } th { background: rgba(0,0,0,0.2) !important; }`;
        document.head.appendChild(style);
    } else {
        root.style.setProperty('--admin-bg', '#f8fafc');
        root.style.setProperty('--admin-sidebar', '#ffffff');
        root.style.setProperty('--admin-card', '#ffffff');
        root.style.setProperty('--admin-text', '#1e293b');
        root.style.setProperty('--admin-text-muted', '#64748b');
        root.style.setProperty('--admin-border', '#e2e8f0');
        const style = document.getElementById('admin-dynamic-style');
        if (style) style.remove();
    }
    
    if (settings.admin_theme_color) {
        root.style.setProperty('--admin-primary', settings.admin_theme_color);
        // Slightly darker hover
        root.style.setProperty('--admin-primary-hover', settings.admin_theme_color);
    }
};

// Initialize Admin Theme on load
if (localStorage.getItem('adminToken')) {
    api.get('/settings').then(s => {
        if (s) window.applyAdminTheme(s);
    }).catch(e => console.error(e));
}
