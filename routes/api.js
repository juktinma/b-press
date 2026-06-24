const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/post');
const Page = require('../models/page');
const Category = require('../models/category');
const Tag = require('../models/tag');
const Comment = require('../models/comment');
const Setting = require('../models/setting');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all API routes below
router.use(authMiddleware);

// ================= UPLOADS =================
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
let config = {};
try {
    config = require('../config.json');
} catch (e) {}
const maxUploadSize = (config.maxUploadSizeMB || 5) * 1024 * 1024;

const upload = multer({ 
    storage,
    limits: { fileSize: maxUploadSize },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|md|mp3|mp4|wav/i;
        const extname = allowedTypes.test(path.extname(file.originalname));
        if (extname) return cb(null, true);
        cb(new Error('不允许上传该类型的文件！'));
    }
});

router.post('/upload', async (req, res, next) => {
    try {
        const dbSettings = await Setting.getAll();
        const maxSize = parseInt(dbSettings.max_upload_size) || 5;
        const maxUploadSizeLimit = maxSize * 1024 * 1024;
        
        const allowedTypesSetting = dbSettings.allowed_upload_types || 'image';
        const typeCategories = allowedTypesSetting.split(',');
        
        let extensions = [];
        if (typeCategories.includes('image')) extensions.push('jpeg', 'jpg', 'png', 'gif', 'webp', 'svg');
        if (typeCategories.includes('document')) extensions.push('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md');
        if (typeCategories.includes('archive')) extensions.push('zip', 'rar', '7z');
        if (typeCategories.includes('media')) extensions.push('mp3', 'mp4', 'wav');
        
        if (extensions.length === 0) extensions.push('jpeg', 'jpg', 'png', 'gif', 'webp', 'svg');

        const allowedRegex = new RegExp('^(' + extensions.join('|') + ')$', 'i');

        const dynamicUpload = multer({ 
            storage,
            limits: { fileSize: maxUploadSizeLimit },
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).substring(1);
                if (allowedRegex.test(ext)) return cb(null, true);
                cb(new Error('不允许上传该类型的文件！'));
            }
        }).single('image');

        dynamicUpload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            res.json({ url: '/uploads/' + req.file.filename, name: req.file.filename });
        });
    } catch(err) {
        next(err);
    }
});

router.get('/uploads', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read uploads directory' });
        const fileData = files.map(f => {
            const stats = fs.statSync(path.join(uploadDir, f));
            return {
                name: f,
                url: '/uploads/' + f,
                size: stats.size,
                created_at: stats.birthtime
            };
        }).sort((a, b) => b.created_at - a.created_at);
        res.json(fileData);
    });
});

router.delete('/uploads/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    res.json({ success: true });
});

// ================= DASHBOARD STATS =================
router.get('/dashboard/stats', async (req, res) => {
    const db = require('../config/db');
    try {
        const [[postCount]] = await db.query('SELECT COUNT(*) as count FROM posts');
        const [[commentCount]] = await db.query('SELECT COUNT(*) as count FROM comments');
        const [[categoryCount]] = await db.query('SELECT COUNT(*) as count FROM categories');
        
        const [recentPosts] = await db.query('SELECT id, title, slug, created_at FROM posts ORDER BY created_at DESC LIMIT 5');
        const [recentComments] = await db.query('SELECT id, author_name, content, created_at FROM comments ORDER BY created_at DESC LIMIT 5');

        res.json({
            counts: {
                posts: postCount.count,
                comments: commentCount.count,
                categories: categoryCount.count
            },
            recentPosts,
            recentComments
        });
    } catch (e) {
        res.status(500).json({ error: 'Stats error' });
    }
});

// ================= POSTS =================
router.get('/posts', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'published';
    const result = await Post.findAll({ status, page, limit });
    res.json(result);
});

router.post('/posts', async (req, res) => {
    const { tags, ...postData } = req.body;
    const id = await Post.create(postData);
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
        await Post.setTags(id, tagArray);
    }
    res.json({ id });
});

router.get('/posts/:id', async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
});

router.put('/posts/:id', async (req, res) => {
    const { tags, ...postData } = req.body;
    await Post.update(req.params.id, postData);
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
        await Post.setTags(req.params.id, tagArray);
    }
    res.json({ success: true });
});

router.delete('/posts/:id', async (req, res) => {
    await Post.delete(req.params.id);
    res.json({ success: true });
});

// ================= PAGES =================
router.get('/pages', async (req, res) => {
    const result = await Page.findAll({ status: req.query.status || 'published' });
    res.json(result);
});

router.post('/pages', async (req, res) => {
    const id = await Page.create(req.body);
    res.json({ id });
});

router.put('/pages/:id', async (req, res) => {
    await Page.update(req.params.id, req.body);
    res.json({ success: true });
});

router.delete('/pages/:id', async (req, res) => {
    await Page.delete(req.params.id);
    res.json({ success: true });
});

// ================= CATEGORIES =================
router.get('/categories', async (req, res) => {
    const result = await Category.findAll();
    res.json(result);
});

router.post('/categories', async (req, res) => {
    const id = await Category.create(req.body);
    res.json({ id });
});

router.delete('/categories/:id', async (req, res) => {
    await Category.delete(req.params.id);
    res.json({ success: true });
});

// ================= COMMENTS =================
router.get('/comments', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await Comment.findAllAdmin({ page, limit });
    res.json(result);
});

router.post('/comments', async (req, res) => {
    const { post_id, page_id, parent_id, author_name, author_email, author_url, content } = req.body;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const id = await Comment.create({
        post_id: post_id ? parseInt(post_id, 10) : null,
        page_id: page_id ? parseInt(page_id, 10) : null,
        parent_id: parent_id ? parseInt(parent_id, 10) : null,
        author_name,
        author_email,
        author_url,
        content,
        ip_address,
        status: 'approved' // Admin replies are auto-approved
    });
    res.json({ id });
});

router.put('/comments/:id/status', async (req, res) => {
    const db = require('../config/db');
    await db.query('UPDATE comments SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ success: true });
});

router.delete('/comments/:id', async (req, res) => {
    await Comment.delete(req.params.id);
    res.json({ success: true });
});

// ================= SETTINGS =================
router.get('/settings', async (req, res) => {
    const settings = await Setting.getAll();
    res.json(settings);
});

router.put('/settings', async (req, res) => {
    for (const [key, value] of Object.entries(req.body)) {
        await Setting.set(key, value);
    }
    res.json({ success: true });
});

module.exports = router;
