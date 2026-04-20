require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      multipleStatements: true // Enable multiple statements
    });

    console.log('Connected to MySQL server.');

    const sqlScript = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

    await connection.query(sqlScript);
    
    console.log('Executed database.sql successfully.');
    
    // Hash admin password if needed, but for simplicity let's assume we do it in an app script later or set it here.
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('police@2026', salt);
    
    await connection.query('USE police_portal');
    await connection.query('UPDATE users SET password = ? WHERE email = "admin@citypolice.gov.in"', [hashedPassword]);
    
    console.log('Admin password hashed and updated.');

    await connection.end();
    console.log('Initialization complete.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}

initDB();
