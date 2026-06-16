const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDB() {
    console.log('Connecting to database...');
    // Connect without database selected first, in case the DB doesn't exist
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true // Crucial for running a whole .sql file
    });

    try {
        console.log(`Creating database ${process.env.DB_NAME} if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.query(`USE \`${process.env.DB_NAME}\`;`);

        console.log('Reading init-db.sql...');
        const sqlPath = path.join(__dirname, 'init-db.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL script...');
        await connection.query(sql);

        console.log('✅ Database initialized successfully!');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    } finally {
        await connection.end();
    }
}

initDB();
