const db = require('../config/db');

class Category {
    static async findAll() {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.query('SELECT * FROM categories WHERE slug = ?', [slug]);
        return rows[0] || null;
    }

    static async create(data) {
        const { name, slug, description } = data;
        const [result] = await db.query(
            'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
            [name, slug, description || '']
        );
        return result.lastID;
    }

    static async update(id, data) {
        const { name, slug, description } = data;
        await db.query(
            'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
            [name, slug, description, id]
        );
    }

    static async delete(id) {
        await db.query('DELETE FROM categories WHERE id = ?', [id]);
    }
}

module.exports = Category;
