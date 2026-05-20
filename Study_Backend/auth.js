const { db } = require("./Database_Operations/connection");
const { dbGet } = require("./Database_Operations/helpers");

const hasPermission = async (role, permission) => {
  const row = await dbGet(db,
    `SELECT 1
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.permission_id
     JOIN roles r ON rp.role_id = r.role_id
     WHERE r.role_name = ? AND p.permission_name = ?`,
    [role, permission]
  );
  return !!row;
};

module.exports = { hasPermission };
