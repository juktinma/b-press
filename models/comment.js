const db = require('../config/db');

class Comment {
    static async findByPostId(postId, status = 'approved') {
        const [rows] = await db.query(
            'SELECT * FROM comments WHERE post_id = ? AND status = ? ORDER BY created_at ASC',
            [postId, status]
        );
        return this._buildTree(rows);
    }

    static async findByPageId(pageId, status = 'approved') {
        const [rows] = await db.query(
            'SELECT * FROM comments WHERE page_id = ? AND status = ? ORDER BY created_at ASC',
            [pageId, status]
        );
        return this._buildTree(rows);
    }

    static async findAllAdmin({ page = 1, limit = 20, status } = {}) {
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM comments';
        let countQuery = 'SELECT COUNT(*) as total FROM comments';
        const params = [];
        
        if (status) {
            query += ' WHERE status = ?';
            countQuery += ' WHERE status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const [rows] = await db.query(query, [...params, limit, offset]);
        const [countRow] = await db.query(countQuery, params);
        
        return {
            comments: rows,
            total: countRow[0].total,
            totalPages: Math.ceil(countRow[0].total / limit),
            currentPage: page
        };
    }

    static async create(data) {
        const { post_id, page_id, parent_id, author_name, author_email, author_url, content, ip_address, status } = data;
        const [result] = await db.query(
            'INSERT INTO comments (post_id, page_id, parent_id, author_name, author_email, author_url, content, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [post_id || null, page_id || null, parent_id || null, author_name, author_email || null, author_url || null, content, ip_address || null, status || 'pending']
        );
        return result.lastID;
    }

    static async updateStatus(id, status) {
        await db.query('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
    }

    static async delete(id) {
        await db.query('DELETE FROM comments WHERE id = ?', [id]);
    }

    // Helper to build nested comment tree
    static _buildTree(comments) {
        const map = {};
        const roots = [];
        
        comments.forEach(c => {
            c.children = [];
            map[c.id] = c;
        });
        
        comments.forEach(c => {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].children.push(c);
            } else {
                roots.push(c);
            }
        });
        
        return roots;
    }
}

module.exports = Comment;
