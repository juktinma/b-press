const db = require('../config/db');

class Tag {
    static async findAll() {
        const [rows] = await db.query('SELECT * FROM tags ORDER BY name ASC');
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.query('SELECT * FROM tags WHERE slug = ?', [slug]);
        return rows[0] || null;
    }

    static async create(name, slug) {
        const [result] = await db.query(
            'INSERT INTO tags (name, slug) VALUES (?, ?)',
            [name, slug]
        );
        return result.lastID;
    }

    static async delete(id) {
        await db.query('DELETE FROM tags WHERE id = ?', [id]);
    }
}

module.exports = Tag;
