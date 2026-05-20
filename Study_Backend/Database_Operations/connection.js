const sqlite3 = require("sqlite3").verbose();
const path = require("path");

//i mean we dont need this jsut to follow the standards 
const DB_PATH = path.join(__dirname, "..", "Database_Files", "Study.db");


//more like centralized locations to hold everything related to db hence to 
// above the race condition / dead lock / resource propagation

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("Database connection failed:", err.message);
  else console.log("Connected to SQLite database");
});

db.run("PRAGMA foreign_keys = ON;");

module.exports = { db };
