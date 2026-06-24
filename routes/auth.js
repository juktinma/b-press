const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findByUsername(username);

        if (!admin) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const payload = {
            id: admin.id,
            username: admin.username,
            display_name: admin.display_name
        };

        let config = {};
        try {
            config = require('../config.json');
        } catch (e) {}
        const Setting = require('../models/setting');
        const dbSettings = await Setting.getAll();
        const expiresIn = dbSettings.jwt_expires_in || config.jwtExpiresIn || '7d';

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

        res.json({ token, user: payload });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/me', authMiddleware, (req, res) => {
    res.json(req.admin);
});

// Setup Initial Admin endpoint (only works if no admins exist)
router.post('/setup', async (req, res) => {
    try {
        const db = require('../config/db');
        const [rows] = await db.query('SELECT COUNT(*) as c FROM admins');
        if (rows[0].c > 0) {
            return res.status(400).json({ error: 'Admin already initialized' });
        }
        
        const { username, password, display_name } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await Admin.create(username, hash, display_name);
        res.json({ success: true, message: 'Admin created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        const adminId = req.admin.id;

        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: '旧密码不正确' });
        }

        let newHash = null;
        if (newPassword && newPassword.trim() !== '') {
            newHash = await bcrypt.hash(newPassword, 10);
        }

        // Check if username is being changed and if it already exists
        if (username !== admin.username) {
            const existing = await Admin.findByUsername(username);
            if (existing) {
                return res.status(400).json({ error: '用户名已被占用' });
            }
        }

        await Admin.update(adminId, username, newHash);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
