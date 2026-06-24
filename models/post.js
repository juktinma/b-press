const db = require('../config/db');

class Post {
    static async findAll({ status = 'published', page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;
        let query = `SELECT p.*, c.name as category_name, c.slug as category_slug FROM posts p LEFT JOIN categories c ON p.category_id = c.id`;
        let countQuery = 'SELECT COUNT(*) as total FROM posts';
        let params = [];
        let countParams = [];
        
        if (status !== 'all') {
            query += ' WHERE p.status = ?';
            countQuery += ' WHERE status = ?';
            params.push(status);
            countParams.push(status);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(query, params);
        const [countRow] = await db.query(countQuery, countParams);
        
        return {
            posts: rows,
            total: countRow[0].total,
            totalPages: Math.ceil(countRow[0].total / limit),
            currentPage: page
        };
    }

    static async getTags(postId) {
        const [rows] = await db.query(
            'SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
            [postId]
        );
        return rows;
    }

    static async setTags(postId, tagNames) {
        await db.query('DELETE FROM post_tags WHERE post_id = ?', [postId]);
        if (!tagNames || tagNames.length === 0) return;

        for (let name of tagNames) {
            name = name.trim();
            if (!name) continue;
            
            const slug = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '') || Date.now().toString();
            
            let [rows] = await db.query('SELECT id FROM tags WHERE name = ? OR slug = ?', [name, slug]);
            let tagId;
            if (rows.length > 0) {
                tagId = rows[0].id;
            } else {
                const [result] = await db.query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, slug]);
                tagId = result.lastID;
            }
            
            if (db.isMysql()) {
                await db.query('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
            } else {
                await db.query('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
            }
        }
    }

    static async findBySlug(slug, status = 'published') {
        const [rows] = await db.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM posts p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.slug = ? AND p.status = ?`,
            [slug, status]
        );
        if (!rows[0]) return null;
        const post = rows[0];
        post.tags = (await this.getTags(post.id)).map(t => t.name);
        return post;
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM posts p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );
        if (!rows[0]) return null;
        const post = rows[0];
        post.tags = (await this.getTags(post.id)).map(t => t.name);
        return post;
    }

    static async create(data) {
        const { title, slug, content, excerpt, cover_image, status, category_id, show_cover_in_index, show_cover_in_post, created_at } = data;
        const sql = created_at
            ? 'INSERT INTO posts (title, slug, content, excerpt, cover_image, status, category_id, show_cover_in_index, show_cover_in_post, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            : 'INSERT INTO posts (title, slug, content, excerpt, cover_image, status, category_id, show_cover_in_index, show_cover_in_post) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const params = [title, slug, content, excerpt, cover_image, status || 'published', category_id || null, show_cover_in_index ? 1 : 0, show_cover_in_post ? 1 : 0];
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
        
        await db.query(`UPDATE posts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }

    static async delete(id) {
        await db.query('DELETE FROM posts WHERE id = ?', [id]);
    }

    static async incrementViews(id) {
        await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
    }

    static async findPrevNext(id) {
        const [current] = await db.query('SELECT created_at FROM posts WHERE id = ?', [id]);
        if (!current[0]) return { prev: null, next: null };
        const createdAt = current[0].created_at;

        // Prev post = Older post (created_at < current or same created_at but smaller id)
        const [prevRows] = await db.query(
            `SELECT title, slug FROM posts 
             WHERE status = "published" 
               AND (created_at < ? OR (created_at = ? AND id < ?)) 
             ORDER BY created_at DESC, id DESC LIMIT 1`,
            [createdAt, createdAt, id]
        );

        // Next post = Newer post (created_at > current or same created_at but larger id)
        const [nextRows] = await db.query(
            `SELECT title, slug FROM posts 
             WHERE status = "published" 
               AND (created_at > ? OR (created_at = ? AND id > ?)) 
             ORDER BY created_at ASC, id ASC LIMIT 1`,
            [createdAt, createdAt, id]
        );

        return {
            prev: prevRows[0] || null,
            next: nextRows[0] || null
        };
    }
}

module.exports = Post;
