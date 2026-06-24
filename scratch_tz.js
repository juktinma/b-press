process.env.TZ = 'Asia/Shanghai';
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(':memory:');
db.get("SELECT DATETIME('now', 'localtime') as local_time, CURRENT_TIMESTAMP as utc_time", (e, r) => {
    console.log(r);
});
