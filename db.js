const mysql = require("mysql2/promise");
const fs = require("fs");

const pool = mysql.createPool({
    host: "data-catalog-system-yousefabood.k.aivencloud.com",
    user: "avnadmin",
    password: process.env.DB_PASSWORD,
    database: "defaultdb",
    port: 27898,
    ssl: {
        ca: fs.readFileSync("ca.pem"),
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000
});

module.exports = pool;