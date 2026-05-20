const { db } = require("./connection");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS site (
      site_id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT,
      city TEXT,
      country TEXT,
      status TEXT CHECK(status IN ('Planned','Active','Closed'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS examiner (
      examiner_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_site (
      protocol_id TEXT,
      site_id INTEGER,
      PRIMARY KEY (protocol_id, site_id),
      FOREIGN KEY (protocol_id) REFERENCES Study(protocol_id),
      FOREIGN KEY (site_id) REFERENCES site(site_id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS site_examiner (
      site_id INTEGER,
      examiner_id INTEGER,
      PRIMARY KEY (site_id, examiner_id),
      FOREIGN KEY (site_id) REFERENCES site(site_id) ON DELETE CASCADE,
      FOREIGN KEY (examiner_id) REFERENCES examiner(examiner_id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_site_examiner (
      protocol_id TEXT,
      site_id INTEGER,
      examiner_id INTEGER,
      PRIMARY KEY (protocol_id, site_id, examiner_id),
      FOREIGN KEY (protocol_id, site_id) REFERENCES study_site(protocol_id, site_id),
      FOREIGN KEY (site_id, examiner_id) REFERENCES site_examiner(site_id, examiner_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS examiner_certificate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examiner_id INTEGER NOT NULL,
      protocol_id TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      UNIQUE(examiner_id, protocol_id),
      FOREIGN KEY (examiner_id) REFERENCES examiner(examiner_id) ON DELETE CASCADE,
      FOREIGN KEY (protocol_id) REFERENCES Study(protocol_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      performed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO site VALUES
    (1,'Los Pollos Hermanos Lab','Albuquerque','USA','Active'),
    (2,'Vamonos Pest Research Facility','Albuquerque','USA','Planned'),
    (3,'Madrigal Frankfurt Clinic','Frankfurt','Germany','Active'),
    (4,'Kings Landing Medical Tower','Dubrovnik','Croatia','Active'),
    (5,'Winterfell Health Institute','Belfast','UK','Planned'),
    (6,'Citadel Research Center','Oldtown','UK','Active'),
    (7,'Hawkins National Lab Site A','Hawkins','USA','Active'),
    (8,'Starcourt Mall Medical Wing','Hawkins','USA','Closed'),
    (9,'Kamchatka Research Outpost','Kamchatka','Russia','Active'),
    (10,'Winden Cave Research Lab','Winden','Germany','Planned'),
    (11,'Tannhaus Clinical Center','Winden','Germany','Active'),
    (12,'Missouri Belle Medical Center','Lake Ozark','USA','Active'),
    (13,'Byrde Enterprises Health Wing','Chicago','USA','Planned'),
    (14,'Garrison Pub Research Clinic','Birmingham','UK','Active'),
    (15,'Nelsons Murdock Free Clinic','Hells Kitchen','USA','Active'),
    (16,'Alexandria Safe Zone Medical','Alexandria','USA','Planned'),
    (17,'Hilltop Colony Health Center','Virginia','USA','Active'),
    (18,'Waystar Royco Wellness Center','New York','USA','Active'),
    (19,'Methuen Home Research Lab','Lexington','USA','Closed'),
    (20,'Medellin Recovery Institute','Medellin','Colombia','Planned'),
    (21,'Sweetwater Diagnostics Lab','Westworld Park','USA','Active')
  `);

  db.run(`
    INSERT OR IGNORE INTO examiner VALUES
    (1,'Prof. Walter White','Principal Investigator'),
    (2,'Dr. Jesse Pinkman','Sub Investigator'),
    (3,'Dr. Gus Fring','Principal Investigator'),
    (4,'Dr. Samwell Tarly','Sub Investigator'),
    (5,'Prof. Qyburn','Principal Investigator'),
    (6,'Dr. Jim Hopper','Principal Investigator'),
    (7,'Dr. Martin Brenner','Sub Investigator'),
    (8,'Prof. H.G. Tannhaus','Principal Investigator'),
    (9,'Dr. Jonas Kahnwald','Sub Investigator'),
    (10,'Dr. Ben Davis','Principal Investigator'),
    (11,'Dr. Thomas Shelby','Principal Investigator'),
    (12,'Dr. Claire Temple','Sub Investigator'),
    (13,'Dr. Eugene Porter','Principal Investigator'),
    (14,'Dr. Gerri Kellman','Sub Investigator'),
    (15,'Prof. Beth Harmon','Principal Investigator'),
    (16,'Dr. Steve Murphy','Sub Investigator')
  `);

  db.run(`
    INSERT OR IGNORE INTO study_site VALUES
    ('BB-001',1),('BB-001',2),
    ('BB-002',1),('BB-002',3),
    ('GOT-001',4),('GOT-001',5),
    ('GOT-002',4),('GOT-002',6),
    ('STR-001',7),('STR-001',8),
    ('STR-002',7),('STR-002',9),
    ('DRK-001',10),('DRK-001',11),
    ('MNY-001',12),('MNY-001',13),
    ('PF-001',14),
    ('NF-001',15),
    ('WD-001',16),('WD-001',17),
    ('SU-001',18),
    ('QG-001',19),
    ('NC-001',20),
    ('WW-001',21)
  `);

  // Site-level examiner pool (who CAN work at this site)
  db.run(`
    INSERT OR IGNORE INTO site_examiner VALUES
    (1,1),(1,2),(1,3),
    (3,3),
    (4,4),(4,5),
    (5,4),
    (6,4),(6,5),
    (7,6),(7,7),(7,9),
    (9,6),
    (10,8),(11,8),(11,9),
    (12,10),(13,10),
    (14,11),
    (15,12),
    (16,13),(17,13),
    (18,14),
    (19,15),
    (20,16),
    (21,1)
  `);

  db.run(`
    INSERT OR IGNORE INTO examiner_certificate VALUES
    (1,1,'BB-001','2025-12-20'),
    (2,2,'BB-001','2025-08-10'),
    (3,1,'BB-002','2026-04-15'),
    (4,2,'BB-002','2025-03-01'),
    (5,3,'BB-002','2026-06-30'),
    (6,5,'GOT-001','2025-04-20'),
    (7,4,'GOT-001','2025-09-25'),
    (8,6,'STR-001','2025-10-18'),
    (9,7,'STR-001','2026-01-05'),
    (10,6,'STR-002','2026-03-22'),
    (11,8,'DRK-001','2027-03-01'),
    (12,10,'MNY-001','2025-08-28'),
    (13,11,'PF-001','2026-02-14'),
    (14,12,'NF-001','2025-11-10'),
    (15,13,'WD-001','2027-02-01'),
    (16,14,'SU-001','2025-02-15'),
    (17,15,'QG-001','2025-01-30'),
    (18,16,'NC-001','2027-01-15'),
    (19,1,'WW-001','2025-09-05')
  `);

  // Fix dates for existing DBs
  const certDates = [
    [1,'2025-12-20'],[2,'2025-08-10'],[3,'2026-04-15'],[4,'2025-03-01'],
    [5,'2026-06-30'],[6,'2025-04-20'],[7,'2025-09-25'],[8,'2025-10-18'],
    [9,'2026-01-05'],[10,'2026-03-22'],[11,'2027-03-01'],[12,'2025-08-28'],
    [13,'2026-02-14'],[14,'2025-11-10'],[15,'2027-02-01'],[16,'2025-02-15'],
    [17,'2025-01-30'],[18,'2027-01-15'],[19,'2025-09-05']
  ];
  certDates.forEach(([id, d]) => db.run(`UPDATE examiner_certificate SET expiry_date = ? WHERE id = ?`, [d, id]));

  db.run(`
    INSERT OR IGNORE INTO study_site_examiner VALUES
    ('BB-001',1,1),('BB-001',1,2),
    ('BB-002',1,1),('BB-002',1,2),('BB-002',1,3),
    ('BB-002',3,3),
    ('GOT-001',4,5),
    ('GOT-001',5,4),
    ('GOT-002',4,4),('GOT-002',4,5),
    ('GOT-002',6,4),('GOT-002',6,5),
    ('STR-001',7,6),('STR-001',7,7),
    ('STR-002',7,6),('STR-002',7,7),('STR-002',7,9),
    ('STR-002',9,6),
    ('DRK-001',10,8),
    ('DRK-001',11,8),('DRK-001',11,9),
    ('MNY-001',12,10),
    ('MNY-001',13,10),
    ('PF-001',14,11),
    ('NF-001',15,12),
    ('WD-001',16,13),('WD-001',17,13),
    ('SU-001',18,14),
    ('QG-001',19,15),
    ('NC-001',20,16),
    ('WW-001',21,1)
  `);
});

module.exports = { db };
