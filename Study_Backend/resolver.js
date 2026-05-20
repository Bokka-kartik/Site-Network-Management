const { db } = require("./Database_Operations/connection");
const { dbAll, dbGet, dbRun } = require("./Database_Operations/helpers");
const { hasPermission } = require("./auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

require("./Database_Operations/roles_permission");
require("./Database_Operations/user");
require("./Database_Operations/db");
require("./Database_Operations/study_relations");

const assertPermission = async (context, permission) => {
  if (!context.user || !(await hasPermission(context.user.role_name, permission)))
    throw new Error("Permission denied");
};

const logAudit = (action, entityType, entityId, details, username) =>
  dbRun(db, "INSERT INTO audit_log (action, entity_type, entity_id, details, performed_by) VALUES (?,?,?,?,?)",
    [action, entityType, String(entityId), details, username || "system"]);

const getUsername = async (context) => {
  if (!context.user) return "system";
  const u = await dbGet(db, "SELECT username FROM users WHERE user_id = ?", [context.user.user_id]);
  return u?.username || "unknown";
};

// Site status: Closed only if manually set. Active if examiner assigned to active study. Else Planned.
const computeSiteStatus = async (siteId) => {
  const site = await dbGet(db, "SELECT status FROM site WHERE site_id = ?", [siteId]);
  if (site?.status === "Closed") return "Closed";
  // Active only if an examiner is assigned to a study at this site with valid cert
  const hasActiveWork = await dbGet(db,
    `SELECT 1 FROM study_site_examiner sse
     JOIN Study s ON sse.protocol_id = s.protocol_id
     JOIN examiner_certificate ec ON ec.examiner_id = sse.examiner_id AND ec.protocol_id = sse.protocol_id
     WHERE sse.site_id = ? AND s.status != 'Completed' AND ec.expiry_date >= date('now')`, [siteId]);
  if (hasActiveWork) return "Active";
  return "Planned";
};

// Study status: Completed if end_date < today or manually set. Active if examiner with valid cert assigned. Else Planned.
const computeStudyStatus = async (protocolId) => {
  const study = await dbGet(db, "SELECT status, end_date FROM Study WHERE protocol_id = ?", [protocolId]);
  if (study?.status === "Completed") return "Completed";
  // Auto-complete if end_date passed
  if (study?.end_date && new Date(study.end_date) < new Date(new Date().toISOString().split('T')[0])) return "Completed";
  // Active if examiner with valid cert is assigned
  const hasActiveWork = await dbGet(db,
    `SELECT 1 FROM study_site_examiner sse
     JOIN examiner_certificate ec ON ec.examiner_id = sse.examiner_id AND ec.protocol_id = sse.protocol_id
     WHERE sse.protocol_id = ? AND ec.expiry_date >= date('now')`, [protocolId]);
  if (hasActiveWork) return "Active";
  return "Planned";
};

const syncSiteStatus = async (siteId) => {
  const newStatus = await computeSiteStatus(siteId);
  await dbRun(db, "UPDATE site SET status = ? WHERE site_id = ?", [newStatus, siteId]);
};

const syncStudyStatus = async (protocolId) => {
  const newStatus = await computeStudyStatus(protocolId);
  await dbRun(db, "UPDATE Study SET status = ? WHERE protocol_id = ?", [newStatus, protocolId]);
};

const resolver = {
  Query: {
    counts: async () => {
      const [s, si, e] = await Promise.all([
        dbGet(db, "SELECT COUNT(*) as c FROM Study"),
  //       new Promise((resolve, reject) =>
  //   db.get("SELECT COUNT(*) as c FROM Study", params, (err, row) => {
  //     if (err) reject(err);
  //     else resolve(row);
  //   })
  // ),
        dbGet(db, "SELECT COUNT(*) as c FROM site"),
        dbGet(db, "SELECT COUNT(*) as c FROM examiner"),
      ]);
      return { studies: s.c, sites: si.c, examiners: e.c };
    },
    studies: async (_, { page = 1, perPage, search, sortCol, sortDir = "asc" } = {}) => {
      await dbRun(db, `UPDATE Study SET status = 'Completed' WHERE end_date IS NOT NULL AND end_date < date('now') AND status != 'Completed'`);
      const validCols = ["study_name", "protocol_id", "sponsor", "phase", "start_date", "end_date", "status"];
      let where = "", params = [];
      if (search) {
        where = "WHERE study_name LIKE ? OR protocol_id LIKE ? OR sponsor LIKE ? OR phase LIKE ? OR status LIKE ?";
        const q = `%${search}%`;
        params = [q, q, q, q, q];
      }
      const order = validCols.includes(sortCol) ? `ORDER BY ${sortCol} ${sortDir === "desc" ? "DESC" : "ASC"}` : "";
      const { c: total } = await dbGet(db, `SELECT COUNT(*) as c FROM Study ${where}`, params);
      if (!perPage) return { items: await dbAll(db, `SELECT * FROM Study ${where} ${order}`, params), total, totalPages: 1 };
      const totalPages = Math.ceil(total / perPage) || 1;
      const items = await dbAll(db, `SELECT * FROM Study ${where} ${order} LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
      return { items, total, totalPages };
    },
    sites: async (_, { page = 1, perPage, search, sortCol, sortDir = "asc" } = {}) => {
      const validCols = ["site_name", "city", "country", "status"];
      let where = "", params = [];
      if (search) {
        where = "WHERE site_name LIKE ? OR city LIKE ? OR country LIKE ? OR status LIKE ?";
        const q = `%${search}%`;
        params = [q, q, q, q];
      }
      const order = validCols.includes(sortCol) ? `ORDER BY ${sortCol} ${sortDir === "desc" ? "DESC" : "ASC"}` : "";
      const { c: total } = await dbGet(db, `SELECT COUNT(*) as c FROM site ${where}`, params);
      if (!perPage) return { items: await dbAll(db, `SELECT * FROM site ${where} ${order}`, params), total, totalPages: 1 };
      const totalPages = Math.ceil(total / perPage) || 1;
      const items = await dbAll(db, `SELECT * FROM site ${where} ${order} LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
      return { items, total, totalPages };
    },
    examiners: async (_, { page = 1, perPage, search, sortCol, sortDir = "asc" } = {}) => {
      const validCols = ["name", "role"];
      let where = "", params = [];
      if (search) {
        where = "WHERE name LIKE ? OR role LIKE ?";
        const q = `%${search}%`;
        params = [q, q];
      }
      const order = validCols.includes(sortCol) ? `ORDER BY ${sortCol} ${sortDir === "desc" ? "DESC" : "ASC"}` : "";
      const { c: total } = await dbGet(db, `SELECT COUNT(*) as c FROM examiner ${where}`, params);
      if (!perPage) return { items: await dbAll(db, `SELECT * FROM examiner ${where} ${order}`, params), total, totalPages: 1 };
      const totalPages = Math.ceil(total / perPage) || 1;
      const items = await dbAll(db, `SELECT * FROM examiner ${where} ${order} LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
      return { items, total, totalPages };
    },

    // Detail: only data relevant to THIS study
    studyDetail: async (_, { protocol_id }) => {
      const study = await dbGet(db, "SELECT * FROM Study WHERE protocol_id = ?", [protocol_id]);
      const studySites = await dbAll(db,
        `SELECT s.* FROM site s JOIN study_site ss ON s.site_id = ss.site_id WHERE ss.protocol_id = ?`, [protocol_id]);
      for (const s of studySites) {
        s._study_protocol_id = protocol_id;
        // Only examiners assigned to this site AND who have a valid cert for this study (eligible pool for assignment)
        s._all_site_examiners = await dbAll(db,
          `SELECT e.* FROM examiner e
           JOIN site_examiner se ON e.examiner_id = se.examiner_id
           WHERE se.site_id = ? AND EXISTS (
             SELECT 1 FROM examiner_certificate ec
             WHERE ec.examiner_id = e.examiner_id AND ec.protocol_id = ? AND ec.expiry_date >= date('now')
           )`, [s.site_id, protocol_id]);
      }
      if (study) study._preloaded_sites = studySites;
      return { study, sites: [], examiners: [] };
    },

    // Detail: only data relevant to THIS site — nest examiners per study
    siteDetail: async (_, { site_id }) => {
      const site = await dbGet(db, "SELECT * FROM site WHERE site_id = ?", [site_id]);
      const siteStudies = await dbAll(db,
        `SELECT st.* FROM Study st JOIN study_site ss ON st.protocol_id = ss.protocol_id WHERE ss.site_id = ?`, [site_id]);
      for (const st of siteStudies) {
        const assigned = await dbAll(db,
          `SELECT examiner_id FROM study_site_examiner WHERE protocol_id = ? AND site_id = ?`, [st.protocol_id, site_id]);
        st._assigned_examiner_ids = assigned.map(r => r.examiner_id);
      }
      const siteExaminers = await dbAll(db,
        `SELECT e.* FROM examiner e JOIN site_examiner se ON e.examiner_id = se.examiner_id WHERE se.site_id = ?`, [site_id]);
      // Attach studies per examiner at this site
      for (const ex of siteExaminers) {
        ex._detail_studies = await dbAll(db,
          `SELECT st.* FROM Study st JOIN study_site_examiner sse ON st.protocol_id = sse.protocol_id
           WHERE sse.site_id = ? AND sse.examiner_id = ?`, [site_id, ex.examiner_id]);
      }
      if (site) { site._detail_studies = siteStudies; site._detail_examiners = siteExaminers; }
      return { site, studies: [], examiners: [] };
    },

    // Detail: only data relevant to THIS examiner — nest studies inside sites
    examinerDetail: async (_, { examiner_id }) => {
      const examiner = await dbGet(db, "SELECT * FROM examiner WHERE examiner_id = ?", [examiner_id]);
      const exSites = await dbAll(db,
        `SELECT s.* FROM site s JOIN site_examiner se ON s.site_id = se.site_id WHERE se.examiner_id = ?`, [examiner_id]);
      // Attach studies per site that this examiner is assigned to
      for (const site of exSites) {
        site._detail_studies = await dbAll(db,
          `SELECT st.* FROM Study st JOIN study_site_examiner sse ON st.protocol_id = sse.protocol_id
           WHERE sse.site_id = ? AND sse.examiner_id = ?`, [site.site_id, examiner_id]);
      }
      const exStudies = await dbAll(db,
        `SELECT DISTINCT st.* FROM Study st JOIN study_site_examiner sse ON st.protocol_id = sse.protocol_id WHERE sse.examiner_id = ?`, [examiner_id]);
      const certs = await dbAll(db,
        `SELECT ec.*, s.study_name, s.end_date as study_end_date FROM examiner_certificate ec
         JOIN Study s ON ec.protocol_id = s.protocol_id WHERE ec.examiner_id = ?`, [examiner_id]);
      if (examiner) { examiner._detail_sites = exSites; examiner._detail_studies = exStudies; examiner._detail_certs = certs; }
      return { examiner, sites: [], studies: [] };
    },

    // Dropdown data: unassigned sites for a study
    unassignedSitesForStudy: async (_, { protocol_id }) => {
      const sites = await dbAll(db,
        `SELECT * FROM site WHERE site_id NOT IN (SELECT site_id FROM study_site WHERE protocol_id = ?)`, [protocol_id]);
      for (const s of sites) {
        s._flat = true;
        s._examiners = await dbAll(db,
          `SELECT e.* FROM examiner e JOIN site_examiner se ON e.examiner_id = se.examiner_id WHERE se.site_id = ?`, [s.site_id]);
      }
      return sites;
    },

    // Dropdown data: unassigned studies + all examiners for a site
    unassignedForSite: async (_, { site_id }) => {
      const studies = await dbAll(db,
        `SELECT * FROM Study WHERE protocol_id NOT IN (SELECT protocol_id FROM study_site WHERE site_id = ?)`, [site_id]);
      const examiners = await dbAll(db, `SELECT * FROM examiner WHERE examiner_id NOT IN (SELECT examiner_id FROM site_examiner WHERE site_id = ?)`, [site_id]);
      return { studies, examiners };
    },

    // Dropdown data: unassigned sites for an examiner
    unassignedSitesForExaminer: async (_, { examiner_id }) => {
      const sites = await dbAll(db,
        `SELECT * FROM site WHERE site_id NOT IN (SELECT site_id FROM site_examiner WHERE examiner_id = ?)`, [examiner_id]);
      for (const s of sites) {
        s._dropdown_studies = await dbAll(db,
          `SELECT st.* FROM Study st JOIN study_site ss ON st.protocol_id = ss.protocol_id WHERE ss.site_id = ?`, [s.site_id]);
      }
      return sites;
    },

    auditLogs: async (_, { entity_type, entity_id }) => {
      if (entity_type && entity_id)
        return dbAll(db, "SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC", [entity_type, entity_id]);
      if (entity_type)
        return dbAll(db, "SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_at DESC", [entity_type]);
      return dbAll(db, "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200");
    },
    users: () => dbAll(db, `SELECT u.user_id, u.username, u.email, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id`),
  },

  User: {
    role: (parent) => parent.role_name,
    permissions: async (parent) => {
      const rows = await dbAll(db,
        `SELECT p.permission_name FROM permissions p
         JOIN role_permissions rp ON p.permission_id = rp.permission_id
         JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = ?`,
        [parent.role_name]);
      return rows.map((p) => p.permission_name);
    },
  },

  Study: {
    sites: async (parent) => {
      if (parent._preloaded_sites) return parent._preloaded_sites;
      const sites = await dbAll(db,
        `SELECT s.* FROM site s JOIN study_site ss ON s.site_id = ss.site_id WHERE ss.protocol_id = ?`,
        [parent.protocol_id]);
      for (const site of sites) site._study_protocol_id = parent.protocol_id;
      return sites;
    },
    assigned_examiner_ids: (parent) => parent._assigned_examiner_ids || null,
  },

  Site: {
    examiners: (parent) => {
      if (parent._flat) return parent._examiners || [];
      if (parent._detail_examiners) return parent._detail_examiners;
      if (parent._study_protocol_id) {
        return dbAll(db,
          `SELECT e.* FROM examiner e JOIN study_site_examiner sse ON e.examiner_id = sse.examiner_id
           WHERE sse.site_id = ? AND sse.protocol_id = ?`,
          [parent.site_id, parent._study_protocol_id]);
      }
      return dbAll(db,
        `SELECT e.* FROM examiner e JOIN site_examiner se ON e.examiner_id = se.examiner_id WHERE se.site_id = ?`,
        [parent.site_id]);
    },
    all_examiners: (parent) => {
      if (parent._all_site_examiners) return parent._all_site_examiners;
      return null;
    },
    studies: (parent) => {
      if (parent._detail_studies) return parent._detail_studies;
      if (parent._dropdown_studies) return parent._dropdown_studies;
      return dbAll(db,
        `SELECT st.* FROM Study st JOIN study_site ss ON st.protocol_id = ss.protocol_id WHERE ss.site_id = ?`,
        [parent.site_id]);
    },
  },

  Examiner: {
    site_status: async (parent) => {
      const row = await dbGet(db, "SELECT COUNT(*) as c FROM site_examiner WHERE examiner_id = ?", [parent.examiner_id]);
      return row && row.c > 0 ? "Assigned" : "Unassigned";
    },
    study_status: async (parent) => {
      // Working = non-expired cert + assigned to study_site_examiner + study not Completed
      const row = await dbGet(db,
        `SELECT 1 FROM study_site_examiner sse
         JOIN examiner_certificate ec ON ec.examiner_id = sse.examiner_id AND ec.protocol_id = sse.protocol_id
         JOIN Study s ON s.protocol_id = sse.protocol_id
         WHERE sse.examiner_id = ? AND ec.expiry_date >= date('now') AND s.status != 'Completed'`, [parent.examiner_id]);
      return row ? "Working" : "Not Working";
    },
    sites: (parent) => {
      if (parent._detail_sites) return parent._detail_sites;
      return dbAll(db,
        `SELECT s.* FROM site s JOIN site_examiner se ON s.site_id = se.site_id WHERE se.examiner_id = ?`,
        [parent.examiner_id]);
    },
    studies: (parent) => {
      if (parent._detail_studies) return parent._detail_studies;
      return dbAll(db,
        `SELECT DISTINCT st.* FROM Study st JOIN study_site_examiner sse ON st.protocol_id = sse.protocol_id WHERE sse.examiner_id = ?`,
        [parent.examiner_id]);
    },
    certificates: (parent) => {
      if (parent._detail_certs) return parent._detail_certs;
      return dbAll(db,
        `SELECT ec.*, s.study_name, s.end_date as study_end_date FROM examiner_certificate ec
         JOIN Study s ON ec.protocol_id = s.protocol_id WHERE ec.examiner_id = ?`,
        [parent.examiner_id]);
    },
  },

  Mutation: {
    createStudy: async (_, args, context) => {
      await assertPermission(context, "study_create");
      const username = await getUsername(context);
      try {
        await dbRun(db, "INSERT INTO Study VALUES (?,?,?,?,?,?,?)",
          [args.protocol_id, args.study_name, args.sponsor, args.phase, args.start_date, args.end_date || null, "Planned"]);
      } catch (err) {
        if (err.message.includes("UNIQUE") || err.message.includes("PRIMARY"))
          throw new Error(`Protocol ID "${args.protocol_id}" already exists`);
        throw err;
      }
      await logAudit("Created Study", "study", args.protocol_id, `Study "${args.study_name}" created (Planned)`, username);
      return dbGet(db, "SELECT * FROM Study WHERE protocol_id = ?", [args.protocol_id]);
    },

    createSite: async (_, args, context) => {
      await assertPermission(context, "site_manage");
      const username = await getUsername(context);
      const result = await dbRun(db, "INSERT INTO site (site_name, city, country, status) VALUES (?,?,?,?)",
        [args.site_name, args.city, args.country, "Planned"]);
      const siteId = result.lastID;
      if (args.examiner_id) {
        await dbRun(db, "INSERT OR IGNORE INTO site_examiner VALUES (?,?)", [siteId, args.examiner_id]);
      }
      await logAudit("Created Site", "site", siteId, `Site "${args.site_name}" created (Planned)`, username);
      return dbGet(db, "SELECT * FROM site WHERE site_id = ?", [siteId]);
    },

    createExaminer: async (_, args, context) => {
      await assertPermission(context, "examiner_manage");
      const username = await getUsername(context);
      const result = await dbRun(db, "INSERT INTO examiner (name, role) VALUES (?,?)",
        [args.name, args.role.replace("_", " ")]);
      const exId = result.lastID;
      if (args.cert_study && args.cert_expiry) {
        await dbRun(db, "INSERT OR REPLACE INTO examiner_certificate (examiner_id, protocol_id, expiry_date) VALUES (?,?,?)",
          [exId, args.cert_study, args.cert_expiry]);
      }
      await logAudit("Created Examiner", "examiner", exId, `Examiner "${args.name}" created (${args.role.replace("_", " ")})`, username);
      return dbGet(db, "SELECT * FROM examiner WHERE examiner_id = ?", [exId]);
    },

    upsertCertificate: async (_, args, context) => {
      await assertPermission(context, "examiner_manage");
      const username = await getUsername(context);
      if (!args.protocol_id) throw new Error("Study (protocol_id) is required");
      const existing = await dbGet(db, "SELECT expiry_date FROM examiner_certificate WHERE examiner_id = ? AND protocol_id = ?", [args.examiner_id, args.protocol_id]);
      await dbRun(db,
        "INSERT OR REPLACE INTO examiner_certificate (examiner_id, protocol_id, expiry_date) VALUES (?,?,?)",
        [args.examiner_id, args.protocol_id, args.expiry_date]);
      const study = await dbGet(db, "SELECT study_name FROM Study WHERE protocol_id = ?", [args.protocol_id]);
      const ex = await dbGet(db, "SELECT name FROM examiner WHERE examiner_id = ?", [args.examiner_id]);
      if (existing) {
        await logAudit("Updated Certificate", "examiner", args.examiner_id, `"${ex?.name}" certificate for "${study?.study_name}" extended from ${existing.expiry_date} to ${args.expiry_date}`, username);
      } else {
        await logAudit("Added Certificate", "examiner", args.examiner_id, `"${ex?.name}" certified for "${study?.study_name}" until ${args.expiry_date}`, username);
      }
      return dbGet(db,
        `SELECT ec.*, s.study_name, s.end_date as study_end_date FROM examiner_certificate ec
         JOIN Study s ON ec.protocol_id = s.protocol_id
         WHERE ec.examiner_id = ? AND ec.protocol_id = ?`,
        [args.examiner_id, args.protocol_id]);
    },

    assignStudyToSite: async (_, args, context) => {
      await assertPermission(context, "site_manage");
      const username = await getUsername(context);
      const site = await dbGet(db, "SELECT site_name, status FROM site WHERE site_id = ?", [args.site_id]);
      if (site?.status === "Closed") throw new Error(`Cannot assign study to closed site "${site.site_name}"`);
      const existing = await dbGet(db, "SELECT 1 FROM study_site WHERE protocol_id = ? AND site_id = ?", [args.protocol_id, args.site_id]);
      if (existing) throw new Error("This study is already assigned to this site");
      await dbRun(db, "INSERT INTO study_site VALUES (?,?)", [args.protocol_id, args.site_id]);
      await syncSiteStatus(args.site_id);
      await syncStudyStatus(args.protocol_id);
      const study = await dbGet(db, "SELECT study_name FROM Study WHERE protocol_id = ?", [args.protocol_id]);
      await logAudit("Assigned Site to Study", "study", args.protocol_id, `Site "${site?.site_name}" assigned to study "${study?.study_name}"`, username);
      await logAudit("Assigned Study to Site", "site", args.site_id, `Study "${study?.study_name}" assigned to site "${site?.site_name}"`, username);
      return true;
    },

    assignExaminerToSite: async (_, args, context) => {
      await assertPermission(context, "assignment_manage");
      const username = await getUsername(context);
      const site = await dbGet(db, "SELECT site_name, status FROM site WHERE site_id = ?", [args.site_id]);
      if (site?.status === "Closed") throw new Error(`Cannot assign examiner to closed site "${site.site_name}"`);
      // Certificate check: if assigning to a study, examiner must have a valid cert
      if (args.protocol_id) {
        const cert = await dbGet(db,
          `SELECT 1 FROM examiner_certificate WHERE examiner_id = ? AND protocol_id = ? AND expiry_date >= date('now')`,
          [args.examiner_id, args.protocol_id]);
        if (!cert) {
          const study = await dbGet(db, "SELECT study_name FROM Study WHERE protocol_id = ?", [args.protocol_id]);
          throw new Error(`Examiner does not have a valid certificate for study "${study?.study_name || args.protocol_id}"`);
        }
      }
      await dbRun(db, "INSERT OR IGNORE INTO site_examiner VALUES (?,?)", [args.site_id, args.examiner_id]);
      const ex = await dbGet(db, "SELECT name FROM examiner WHERE examiner_id = ?", [args.examiner_id]);
      if (args.protocol_id) {
        const ss = await dbGet(db, "SELECT 1 FROM study_site WHERE protocol_id = ? AND site_id = ?", [args.protocol_id, args.site_id]);
        if (!ss) throw new Error("This study is not assigned to this site");
        await dbRun(db, "INSERT OR IGNORE INTO study_site_examiner VALUES (?,?,?)", [args.protocol_id, args.site_id, args.examiner_id]);
        await syncStudyStatus(args.protocol_id);
        const study = await dbGet(db, "SELECT study_name FROM Study WHERE protocol_id = ?", [args.protocol_id]);
        await logAudit("Assigned Examiner", "study", args.protocol_id, `"${ex?.name}" assigned to site "${site?.site_name}" for study "${study?.study_name}"`, username);
      }
      await syncSiteStatus(args.site_id);
      await logAudit("Assigned Examiner to Site", "site", args.site_id, `"${ex?.name}" assigned to site "${site?.site_name}"`, username);
      await logAudit("Assigned to Site", "examiner", args.examiner_id, `"${ex?.name}" assigned to site "${site?.site_name}"`, username);
      return true;
    },

    unassignExaminerFromSite: async (_, args, context) => {
      await assertPermission(context, "assignment_manage");
      const username = await getUsername(context);
      const ex = await dbGet(db, "SELECT name FROM examiner WHERE examiner_id = ?", [args.examiner_id]);
      const site = await dbGet(db, "SELECT site_name FROM site WHERE site_id = ?", [args.site_id]);
      await dbRun(db, "DELETE FROM study_site_examiner WHERE protocol_id = ? AND site_id = ? AND examiner_id = ?",
        [args.protocol_id, args.site_id, args.examiner_id]);
      const remaining = await dbGet(db, "SELECT COUNT(*) as c FROM study_site_examiner WHERE site_id = ? AND examiner_id = ?",
        [args.site_id, args.examiner_id]);
      if (!remaining || remaining.c === 0) {
        await dbRun(db, "DELETE FROM site_examiner WHERE site_id = ? AND examiner_id = ?", [args.site_id, args.examiner_id]);
      }
      await syncStudyStatus(args.protocol_id);
      await syncSiteStatus(args.site_id);
      await logAudit("Unassigned Examiner", "study", args.protocol_id, `"${ex?.name}" removed from site "${site?.site_name}"`, username);
      await logAudit("Unassigned Examiner", "site", args.site_id, `"${ex?.name}" removed from site "${site?.site_name}"`, username);
      await logAudit("Unassigned from Site", "examiner", args.examiner_id, `"${ex?.name}" removed from site "${site?.site_name}"`, username);
      return true;
    },

    updateStudy: async (_, args, context) => {
      await assertPermission(context, "study_update");
      const username = await getUsername(context);
      const before = await dbGet(db, "SELECT * FROM Study WHERE protocol_id = ?", [args.protocol_id]);
      if (args.status === "Completed" && !args.end_date) {
        const today = new Date().toISOString().split('T')[0];
        if (!before.end_date || before.end_date > today) args.end_date = today;
      }
      const fields = ["study_name", "sponsor", "phase", "start_date", "end_date", "status"].filter((f) => args[f] !== undefined);
      if (!fields.length) throw new Error("No fields to update");
      const sets = fields.map((f) => `${f} = ?`).join(", ");
      const vals = fields.map((f) => args[f]);
      await dbRun(db, `UPDATE Study SET ${sets} WHERE protocol_id = ?`, [...vals, args.protocol_id]);
      if (args.end_date && !args.status) {
        const today = new Date().toISOString().split('T')[0];
        if (args.end_date >= today) {
          await dbRun(db, "UPDATE Study SET status = 'Planned' WHERE protocol_id = ? AND status = 'Completed'", [args.protocol_id]);
          await syncStudyStatus(args.protocol_id);
        }
      }
      const changes = [];
      if (args.status && args.status !== before.status) changes.push(`status ${before.status} -> ${args.status}`);
      if (args.end_date && args.end_date !== before.end_date) changes.push(`end date ${before.end_date || 'none'} -> ${args.end_date}`);
      if (changes.length) await logAudit("Updated Study", "study", args.protocol_id, `"${before.study_name}" - ${changes.join(", ")}`, username);
      const relatedSites = await dbAll(db, "SELECT site_id FROM study_site WHERE protocol_id = ?", [args.protocol_id]);
      for (const s of relatedSites) await syncSiteStatus(s.site_id);
      return dbGet(db, "SELECT * FROM Study WHERE protocol_id = ?", [args.protocol_id]);
    },

    updateExaminer: async (_, args, context) => {
      await assertPermission(context, "examiner_manage");
      const fields = ["name", "role"].filter((f) => args[f] !== undefined);
      if (!fields.length) throw new Error("No fields to update");
      const sets = fields.map((f) => `${f} = ?`).join(", ");
      const vals = fields.map((f) => (f === "role" ? args[f].replace("_", " ") : args[f]));
      await dbRun(db, `UPDATE examiner SET ${sets} WHERE examiner_id = ?`, [...vals, args.examiner_id]);
      return dbGet(db, "SELECT * FROM examiner WHERE examiner_id = ?", [args.examiner_id]);
    },

    updateSite: async (_, args, context) => {
      await assertPermission(context, "site_manage");
      const username = await getUsername(context);
      if (args.status === "Active") {
        const hasExaminer = await dbGet(db, "SELECT 1 FROM site_examiner WHERE site_id = ?", [args.site_id]);
        if (!hasExaminer) throw new Error("Cannot set site to Active — no examiners assigned");
      }
      const before = await dbGet(db, "SELECT * FROM site WHERE site_id = ?", [args.site_id]);
      const fields = ["site_name", "city", "country", "status"].filter((f) => args[f] !== undefined);
      if (!fields.length) throw new Error("No fields to update");
      const sets = fields.map((f) => `${f} = ?`).join(", ");
      const vals = fields.map((f) => args[f]);
      await dbRun(db, `UPDATE site SET ${sets} WHERE site_id = ?`, [...vals, args.site_id]);
      if (args.status && args.status !== before.status) {
        await logAudit("Updated Site", "site", args.site_id, `"${before.site_name}" status ${before.status} -> ${args.status}`, username);
      }
      if (args.status) {
        const relatedStudies = await dbAll(db, "SELECT protocol_id FROM study_site WHERE site_id = ?", [args.site_id]);
        for (const s of relatedStudies) await syncStudyStatus(s.protocol_id);
      }
      return dbGet(db, "SELECT * FROM site WHERE site_id = ?", [args.site_id]);
    },

    login: async (_, { usernameOrEmail, password }) => {
      const row = await dbGet(db,
        `SELECT u.user_id, u.username, u.email, u.password_hash, r.role_name
         FROM users u JOIN roles r ON u.role_id = r.role_id
         WHERE u.username = ? OR u.email = ?`,
        [usernameOrEmail, usernameOrEmail]);
      if (!row || !bcrypt.compareSync(password, row.password_hash))
        return { success: false, message: "Invalid credentials" };
      const token = jwt.sign({ user_id: row.user_id, role: row.role_name }, JWT_SECRET, { expiresIn: "8h" });
      const { password_hash, ...user } = row;
      return { success: true, message: "Login successful", user, token };
    },
  },
};

module.exports = { resolver };
