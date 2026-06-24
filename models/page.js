const db = require('../config/db');

class Page {
    static async findAll({ status = 'published' } = {}) {
        let query = 'SELECT * FROM pages';
        let params = [];
        if (status !== 'all') {
            query += ' WHERE status = ?';
            params.push(status);
        }
        query += ' ORDER BY sort_order ASC, created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    }

    static async findNavPages() {
        const [rows] = await db.query(
            'SELECT * FROM pages WHERE status = "published" AND show_in_nav = 1 ORDER BY sort_order ASC'
        );
        return rows;
    }

    static async findBySlug(slug, status = 'published') {
        const [rows] = await db.query('SELECT * FROM pages WHERE slug = ? AND status = ?', [slug, status]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM pages WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async create(data) {
        const { title, slug, content, status, sort_order, show_in_nav, allow_comments, template, cover_image, show_cover_in_post, show_sidebar, show_date, created_at } = data;
        const sql = created_at
            ? 'INSERT INTO pages (title, slug, content, status, sort_order, show_in_nav, allow_comments, template, cover_image, show_cover_in_post, show_sidebar, show_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            : 'INSERT INTO pages (title, slug, content, status, sort_order, show_in_nav, allow_comments, template, cover_image, show_cover_in_post, show_sidebar, show_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const params = [title, slug, content, status || 'published', sort_order || 0, show_in_nav ? 1 : 0, allow_comments ? 1 : 0, template || 'page', cover_image || null, show_cover_in_post ? 1 : 0, show_sidebar !== undefined ? (show_sidebar ? 1 : 0) : 1, show_date !== undefined ? (show_date ? 1 : 0) : 1];
        if (created_at) params.push(created_at);
        const [result] = await db.query(sql, params);
        return result.lastID;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(data)) {
            fields.push(`${k} = ?`);
            values.push(v);
        }
        values.push(id);
        
        await db.query(`UPDATE pages SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }

    static async delete(id) {
        await db.query('DELETE FROM pages WHERE id = ?', [id]);
    }
}

module.exports = Page;
