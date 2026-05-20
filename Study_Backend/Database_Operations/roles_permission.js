const { db } = require("./connection");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT
  );`);

  db.run(`INSERT OR IGNORE INTO roles (role_name, description)
  VALUES
  ('Admin', 'Full access to all application features'),
  ('Viewer', 'Read-only access with search and filters');`);

  db.run(`CREATE TABLE IF NOT EXISTS permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_name TEXT NOT NULL UNIQUE
  );`);

  db.run(`INSERT OR IGNORE INTO permissions (permission_name)
  VALUES
  ('study_create'),
  ('study_update'),
  ('study_read'),
  ('site_manage'),
  ('examiner_manage'),
  ('assignment_manage');`);

  db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
  );`);

  db.run(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.role_name = 'Admin';`);

  db.run(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r
  JOIN permissions p
  WHERE r.role_name = 'Viewer'
    AND p.permission_name = 'study_read';`);
});

module.exports = { db };
