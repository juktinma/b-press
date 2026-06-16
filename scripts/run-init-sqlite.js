const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initDB() {
    console.log('Connecting to SQLite database...');
    const dbPath = path.join(__dirname, '../database.sqlite');
    
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        console.log('Reading init-sqlite.sql...');
        const sqlPath = path.join(__dirname, 'init-sqlite.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL script...');
        // execute multiple statements
        await db.exec(sql);

        console.log('✅ SQLite database initialized successfully at ' + dbPath);
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    } finally {
        await db.close();
    }
}

initDB();
