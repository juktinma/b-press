const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/', (req, res) => {
    if (!global.needsInstall) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../admin/install.html'));
});

router.post('/api/setup', async (req, res) => {
    if (!global.needsInstall) {
        return res.status(400).json({ error: 'Already installed.' });
    }

    try {
        const { dbType, dbHost, dbPort, dbUser, dbPass, dbName, siteTitle, authorName, authorBio, adminEmail, adminUser, adminPass } = req.body;
        
        // 1. Write to .env
        let envContent = '';
        const crypto = require('crypto');
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        envContent += `JWT_SECRET=${jwtSecret}\n`;
        envContent += `DB_TYPE=${dbType}\n`;
        
        if (dbType === 'mysql') {
            envContent += `DB_HOST=${dbHost}\n`;
            envContent += `DB_PORT=${dbPort}\n`;
            envContent += `DB_USER=${dbUser}\n`;
            envContent += `DB_PASSWORD=${dbPass}\n`;
            envContent += `DB_NAME=${dbName}\n`;
        }
        
        envContent += `INSTALL_COMPLETED=true\n`;
        
        // Write .env to disk
        fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
        
        let connection;
        if (dbType === 'mysql') {
            const mysql = require('mysql2/promise');
            try {
                connection = await mysql.createConnection({
                    host: dbHost,
                    port: dbPort,
                    user: dbUser,
                    password: dbPass,
                    database: dbName,
                    multipleStatements: true,
                    connectTimeout: 5000 // 5 seconds timeout
                });
            } catch (err) {
                return res.status(400).json({ error: 'MySQL 连接失败，请检查配置或重试：' + err.message });
            }
            const sql = fs.readFileSync(path.join(__dirname, '../scripts/init-mysql.sql'), 'utf8');
            await connection.query(sql);
            
            // Insert admin
            const hash = await bcrypt.hash(adminPass, 10);
            await connection.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
            // Update settings
            await connection.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['site_title', siteTitle]);
            await connection.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['author_name', authorName]);
            await connection.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['author_bio', authorBio]);
            await connection.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['admin_email', adminEmail]);
            
            await connection.end();
        } else {
            const sqlite3 = require('sqlite3').verbose();
            const { open } = require('sqlite');
            connection = await open({
                filename: path.join(__dirname, '../database.sqlite'),
                driver: sqlite3.Database
            });
            const sql = fs.readFileSync(path.join(__dirname, '../scripts/init-sqlite.sql'), 'utf8');
            await connection.exec(sql);
            
            // Insert admin
            const hash = await bcrypt.hash(adminPass, 10);
            await connection.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
            // Update settings
            await connection.run('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['site_title', siteTitle]);
            await connection.run('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['author_name', authorName]);
            await connection.run('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['author_bio', authorBio]);
            await connection.run('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', ['admin_email', adminEmail]);
            
            await connection.close();
        }

        global.needsInstall = false;
        
        res.json({ success: true });
        
        // Force process exit to reboot the server so DB caches refresh
        setTimeout(() => {
            console.log('Installation completed. Rebooting server...');
            process.exit(0);
        }, 1000);
        
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
