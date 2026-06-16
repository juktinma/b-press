require('dotenv').config();
const path = require('path');

const dbType = process.env.DB_TYPE || 'sqlite';
let dbInstance = null;
let isMysql = dbType === 'mysql';

async function getDB() {
    if (dbInstance) return dbInstance;

    if (isMysql) {
        const mysql = require('mysql2/promise');
        dbInstance = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bgsnblog',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        return dbInstance;
    } else {
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        dbInstance = await open({
            filename: path.join(__dirname, '../database.sqlite'),
            driver: sqlite3.Database
        });
        // Enable foreign keys
        await dbInstance.exec('PRAGMA foreign_keys = ON;');
        return dbInstance;
    }
}

module.exports = {
    getDB,
    isMysql: () => isMysql,
    // Wrapper to unify mysql2 and sqlite interfaces
    query: async (sql, params = []) => {
        const db = await getDB();
        
        if (isMysql) {
            // MySQL2 returns [rows, fields] or [result, fields]
            const [result] = await db.query(sql, params);
            
            // Map insertId to lastID to keep SQLite compatibility in models
            if (result && result.insertId !== undefined) {
                result.lastID = result.insertId;
            }
            
            return [result];
        } else {
            // SQLite
            const upperSql = sql.trim().toUpperCase();
            if (upperSql.startsWith('SELECT')) {
                const rows = await db.all(sql, params);
                return [rows];
            } else {
                const result = await db.run(sql, params);
                return [result];
            }
        }
    }
};
