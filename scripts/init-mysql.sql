-- 1. categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. tags table
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. posts table
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(191) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    cover_image VARCHAR(500),
    status VARCHAR(50) DEFAULT 'published',
    views INT DEFAULT 0,
    category_id INT,
    show_cover_in_index TINYINT(1) DEFAULT 0,
    show_cover_in_post TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. post_tags table
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. pages table
CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(191) UNIQUE NOT NULL,
    content TEXT,
    status VARCHAR(50) DEFAULT 'published',
    sort_order INT DEFAULT 0,
    show_in_nav BOOLEAN DEFAULT 1,
    allow_comments BOOLEAN DEFAULT 0,
    template VARCHAR(100) DEFAULT 'page',
    cover_image VARCHAR(500),
    show_cover_in_post TINYINT(1) DEFAULT 0,
    show_sidebar TINYINT(1) DEFAULT 1,
    show_date TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. comments table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NULL,
    page_id INT NULL,
    parent_id INT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(200),
    author_url VARCHAR(500),
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. settings table
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. theme_settings table
CREATE TABLE IF NOT EXISTS theme_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theme_slug VARCHAR(50) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT,
    UNIQUE KEY unique_theme_key (theme_slug, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_tags_slug ON tags(slug);

-- Initialize basic settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES 
('site_title', 'B-Press Blog'),
('site_description', 'My awesome custom blog'),
('active_theme', 'default');
