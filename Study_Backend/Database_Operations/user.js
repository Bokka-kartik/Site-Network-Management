const { db } = require("./connection");
const bcrypt = require("bcryptjs");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(role_id)
    );
  `);

  // Hash seed passwords, then upsert so existing raw passwords get replaced
  const users = [
    { username: "kartik", email: "kartiksai619@gmail.com", password: "kartik1234", role_id: 1 },
    { username: "viewer_user", email: "viewer@example.com", password: "viewer1234", role_id: 2 },
  ];

  users.forEach(({ username, email, password, role_id }) => {
    const hash = bcrypt.hashSync(password, 10);
    db.run(
      `INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`,
      [username, email, hash, role_id],
      (err) => { if (err) console.error("User upsert failed:", err.message); }
    );
  });
});

module.exports = { db };
