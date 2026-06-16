const db = require('../config/db');

class Admin {
    static async findByUsername(username) {
        const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
        return rows[0] || null;
    }

    static async create(username, passwordHash, displayName) {
        const [result] = await db.query(
            'INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)',
            [username, passwordHash, displayName]
        );
        return result.lastID;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM admins WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async update(id, username, passwordHash) {
        if (passwordHash) {
            await db.query('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?', [username, passwordHash, id]);
        } else {
            await db.query('UPDATE admins SET username = ? WHERE id = ?', [username, id]);
        }
    }
}

module.exports = Admin;
