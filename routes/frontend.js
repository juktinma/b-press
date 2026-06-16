const express = require('express');
const marked = require('marked');
const Post = require('../models/post');
const Page = require('../models/page');
const Category = require('../models/category');
const Tag = require('../models/tag');
const Comment = require('../models/comment');

const router = express.Router();

// Helper to safely render markdown
const renderMarkdown = (content) => {
    try {
        return marked.parse(content || '');
    } catch (e) {
        return content;
    }
};

// Middleware to load common sidebar data
router.use(async (req, res, next) => {
    try {
        const db = require('../config/db');
        
        // 1. Recent Posts
        const recentPosts = await Post.findAll({ status: 'published', limit: 5 });
        
        // 2. Categories
        const categories = await Category.findAll();
        
        // 3. Tags (limit 20)
        const [tags] = await db.query('SELECT * FROM tags LIMIT 20');
        
        // 4. Recent Comments (approved)
        const [comments] = await db.query('SELECT * FROM comments WHERE status="approved" ORDER BY created_at DESC LIMIT 5');

        res.locals.sidebar = {
            recentPosts: recentPosts.posts,
            categories: categories,
            tags: tags,
            recentComments: comments
        };
        next();
    } catch (e) {
        next(e);
    }
});

// Helper to strip markdown syntax into plain text for excerpts
const stripMarkdown = (md) => {
    if (!md) return '';
    return md
        .replace(/!\[.*?\]\(.*?\)/g, '')       // images
        .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → keep text
        .replace(/```[\s\S]*?```/g, '')        // code blocks
        .replace(/`([^`]+)`/g, '$1')           // inline code → keep text
        .replace(/#{1,6}\s?/g, '')             // headings
        .replace(/(\*\*|__)(.*?)\1/g, '$2')    // bold
        .replace(/(\*|_)(.*?)\1/g, '$2')       // italic
        .replace(/~~(.*?)~~/g, '$1')           // strikethrough
        .replace(/>\s?/g, '')                  // blockquotes
        .replace(/[-*+]\s/g, '')               // unordered list
        .replace(/\d+\.\s/g, '')               // ordered list
        .replace(/---+/g, '')                  // hr
        .replace(/\n{2,}/g, ' ')               // multiple newlines
        .replace(/\n/g, ' ')                   // single newlines
        .replace(/\s{2,}/g, ' ')               // collapse spaces
        .trim();
};

// Helper to extract the first image URL from markdown/HTML content
const extractFirstImage = (md) => {
    if (!md) return null;
    // 1. Try markdown image: ![alt](url "title")
    const mdMatch = md.match(/!\[.*?\]\(\s*([^\s)]+)(?:\s+["'].*?["'])?\s*\)/);
    if (mdMatch) return mdMatch[1];
    
    // 2. Try HTML img tag: <img src="url" ...>
    const htmlMatch = md.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
    if (htmlMatch) return htmlMatch[1];
    
    return null;
};

// Helper to render markdown content, removing the first image if it is displayed as a cover
const renderContentWithoutFirstImage = (item, showCover) => {
    let content = item.content || '';
    if (item.cover_image && showCover) {
        // Try to match markdown image at the beginning
        const mdMatch = content.match(/^\s*(!\[.*?\]\(\s*([^\s)]+)(?:\s+["'].*?["'])?\s*\))/);
        if (mdMatch) {
            const mdTag = mdMatch[1];
            const mdUrl = mdMatch[2];
            if (mdUrl === item.cover_image) {
                content = content.replace(mdTag, '');
            }
        } else {
            // Try to match HTML image at the beginning
            const htmlMatch = content.match(/^\s*(<img\s+[^>]*src=["']([^"']+)["'][^>]*>)/i);
            if (htmlMatch) {
                const htmlTag = htmlMatch[1];
                const htmlUrl = htmlMatch[2];
                if (htmlUrl === item.cover_image) {
                    content = content.replace(htmlTag, '');
                }
            }
        }
    }
    return renderMarkdown(content);
};

// Generate excerpt and cover for a post/page
const processExcerpt = (item) => {
    // Extract cover image
    if (!item.cover_image) {
        item.cover_image = extractFirstImage(item.content);
    }
    // Generate text excerpt
    if (!item.excerpt) {
        const plain = stripMarkdown(item.content);
        if (plain.length > 0) {
            item.excerpt = plain.substring(0, 150) + (plain.length > 150 ? '...' : '');
        } else {
            item.excerpt = '点击查看全文...';
        }
    }
};

// Home (Post list)
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await Post.findAll({ status: 'published', page, limit: 10 });

        // Generate clean text excerpts and cover images
        result.posts.forEach(processExcerpt);

        res.renderTheme('index', {
            title: res.locals.site.site_title || 'Blog',
            posts: result.posts,
            pagination: {
                current: result.currentPage,
                total: result.totalPages
            }
        });
    } catch (err) {
        next(err);
    }
});

// Single Post
router.get('/post/:slug', async (req, res, next) => {
    try {
        const post = await Post.findBySlug(req.params.slug);
        if (!post) {
            return res.status(404).renderTheme('page', { title: '404 Not Found', content: 'Post not found' });
        }
        
        // Auto-extract cover image if not explicitly set
        if (!post.cover_image) {
            post.cover_image = extractFirstImage(post.content);
        }

        post.htmlContent = renderContentWithoutFirstImage(post, post.show_cover_in_post);
        Post.incrementViews(post.id).catch(console.error);

        // Fetch comments
        const comments = await Comment.findByPostId(post.id);

        // Fetch prev & next post
        const prevNext = await Post.findPrevNext(post.id);

        res.renderTheme('post', {
            title: post.title,
            post,
            comments,
            prevPost: prevNext.prev,
            nextPost: prevNext.next
        });
    } catch (err) {
        next(err);
    }
});

// Single Page
router.get('/page/:slug', async (req, res, next) => {
    try {
        const pageObj = await Page.findBySlug(req.params.slug);
        if (!pageObj) {
            return res.status(404).renderTheme('page', { title: '404 Not Found', content: 'Page not found' });
        }

        // Auto-extract cover image if not explicitly set
        if (!pageObj.cover_image) {
            pageObj.cover_image = extractFirstImage(pageObj.content);
        }

        pageObj.htmlContent = renderContentWithoutFirstImage(pageObj, pageObj.show_cover_in_post);
        const template = pageObj.template || 'page';
        
        // Fetch comments
        const comments = await Comment.findByPageId(pageObj.id);

        res.renderTheme(template, {
            title: pageObj.title,
            page: pageObj,
            comments
        });
    } catch (err) {
        next(err);
    }
});

// Submit Comment
router.post('/comment', async (req, res, next) => {
    try {
        const { post_id, page_id, parent_id, author_name, author_email, author_url, content, honeypot } = req.body;
        
        // Anti-spam honeypot
        if (honeypot) {
            return res.status(400).send('Spam detected');
        }

        if (!author_name || !content) {
            return res.status(400).send('昵称和评论内容不能为空');
        }

        const ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        await Comment.create({
            post_id: post_id ? parseInt(post_id, 10) : null,
            page_id: page_id ? parseInt(page_id, 10) : null,
            parent_id: parent_id ? parseInt(parent_id, 10) : null,
            author_name,
            author_email,
            author_url,
            content,
            ip_address,
            status: 'pending' // Requires admin approval
        });

        res.redirect(req.headers.referer || '/');
    } catch (err) {
        next(err);
    }
});

// Posts by Tag
router.get('/tag/:slug', async (req, res, next) => {
    try {
        const slug = req.params.slug;
        const db = require('../config/db');
        
        // Find tag first
        const [tagRows] = await db.query('SELECT * FROM tags WHERE slug = ? OR name = ?', [slug, slug]);
        if (tagRows.length === 0) {
            return res.status(404).renderTheme('page', { title: '404 Not Found', content: 'Tag not found' });
        }
        const tag = tagRows[0];
        
        // Find posts with tag
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const [posts] = await db.query(
            `SELECT p.* FROM posts p 
             JOIN post_tags pt ON p.id = pt.post_id 
             WHERE pt.tag_id = ? AND p.status = 'published' 
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [tag.id, limit, offset]
        );
        
        const [countRow] = await db.query(
            `SELECT COUNT(*) as total FROM posts p 
             JOIN post_tags pt ON p.id = pt.post_id 
             WHERE pt.tag_id = ? AND p.status = 'published'`,
            [tag.id]
        );
        
        const total = countRow[0].total;
        const totalPages = Math.ceil(total / limit);
        
        // Process excerpts and covers for these posts
        posts.forEach(processExcerpt);
        
        res.renderTheme('index', {
            title: `标签: ${tag.name}`,
            posts: posts,
            pagination: {
                current: page,
                total: totalPages
            }
        });
    } catch (err) {
        next(err);
    }
});

// Posts by Category
router.get('/category/:slug', async (req, res, next) => {
    try {
        const slug = req.params.slug;
        const db = require('../config/db');
        
        // Find category first
        const [catRows] = await db.query('SELECT * FROM categories WHERE slug = ?', [slug]);
        if (catRows.length === 0) {
            return res.status(404).renderTheme('page', { title: '404 Not Found', content: 'Category not found' });
        }
        const category = catRows[0];
        
        // Find posts in category
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const [posts] = await db.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM posts p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.category_id = ? AND p.status = 'published' 
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [category.id, limit, offset]
        );
        
        const [countRow] = await db.query(
            `SELECT COUNT(*) as total FROM posts WHERE category_id = ? AND status = 'published'`,
            [category.id]
        );
        
        const total = countRow[0].total;
        const totalPages = Math.ceil(total / limit);
        
        // Process excerpts and covers for these posts
        posts.forEach(processExcerpt);
        
        res.renderTheme('index', {
            title: `分类: ${category.name}`,
            posts: posts,
            pagination: {
                current: page,
                total: totalPages
            }
        });
    } catch (err) {
        next(err);
    }
});

// Search Posts
router.get('/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.redirect('/');
        }
        
        const db = require('../config/db');
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const searchTerm = `%${q}%`;
        
        const [posts] = await db.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM posts p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.status = 'published' AND (p.title LIKE ? OR p.content LIKE ?) 
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [searchTerm, searchTerm, limit, offset]
        );
        
        const [countRow] = await db.query(
            `SELECT COUNT(*) as total FROM posts 
             WHERE status = 'published' AND (title LIKE ? OR content LIKE ?)`,
            [searchTerm, searchTerm]
        );
        
        const total = countRow[0].total;
        const totalPages = Math.ceil(total / limit);
        
        // Process excerpts and covers for these posts
        posts.forEach(processExcerpt);
        
        res.renderTheme('index', {
            title: `搜索结果: ${q}`,
            posts: posts,
            pagination: {
                current: page,
                total: totalPages
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
