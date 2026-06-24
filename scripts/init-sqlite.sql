-- 1. categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 2. tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 3. posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    cover_image VARCHAR(500),
    status VARCHAR(50) DEFAULT 'published',
    views INTEGER DEFAULT 0,
    category_id INTEGER,
    show_cover_in_index BOOLEAN DEFAULT 0,
    show_cover_in_post BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. post_tags table
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 5. pages table
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    status VARCHAR(50) DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    show_in_nav BOOLEAN DEFAULT 1,
    allow_comments BOOLEAN DEFAULT 0,
    template VARCHAR(100) DEFAULT 'page',
    cover_image VARCHAR(500),
    show_cover_in_post BOOLEAN DEFAULT 0,
    show_sidebar BOOLEAN DEFAULT 1,
    show_date BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NULL,
    page_id INTEGER NULL,
    parent_id INTEGER NULL,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(200),
    author_url VARCHAR(500),
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 7. admins table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. settings table
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT
);

-- 9. theme_settings table
CREATE TABLE IF NOT EXISTS theme_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_slug VARCHAR(100) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT,
    UNIQUE (theme_slug, `key`)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS posts_updated_at AFTER UPDATE ON posts
BEGIN
    UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS pages_updated_at AFTER UPDATE ON pages
BEGIN
    UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Initialize basic settings
INSERT OR IGNORE INTO settings (`key`, `value`) VALUES 
('site_title', 'B-Press Blog'),
('site_description', 'My awesome custom blog'),
('active_theme', 'default');
