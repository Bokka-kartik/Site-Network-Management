const { db } = require("./connection");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Study (
      protocol_id TEXT PRIMARY KEY,
      study_name TEXT NOT NULL,
      sponsor TEXT NOT NULL,
      phase TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT CHECK(status IN ('Planned','Active','Completed')) NOT NULL
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO Study VALUES
    ('BB-001','Blue Sky Crystal Purity Trial','Gray Matter Technologies','Phase III','2023-06-01','2025-12-01','Active'),
    ('BB-002','Heisenberg Respiratory Study','Madrigal Electromotive','Phase II','2024-01-15','2026-03-01','Planned'),
    ('GOT-001','Wildfire Burn Treatment Research','Lannister Pharmaceuticals','Phase I','2023-09-01','2025-06-30','Active'),
    ('GOT-002','Greyscale Dermatology Trial','Citadel BioSciences','Phase III','2024-04-01','2027-01-01','Planned'),
    ('STR-001','Upside Down Neurology Study','Hawkins National Laboratory','Phase II','2023-11-01','2025-08-01','Completed'),
    ('STR-002','Mind Flayer Immunology Trial','Starcourt Industries','Phase I','2024-05-01','2026-02-01','Active'),
    ('DRK-001','Winden Temporal Genetics Study','Sic Mundus Creatus Est Labs','Phase III','2024-02-01','2027-06-01','Planned'),
    ('MNY-001','Byrde Financial Stress Study','Ruth Langmore Foundation','Phase II','2023-07-15','2025-11-15','Active'),
    ('PF-001','Shelby Toxicology Research','Shelby Company Ltd','Phase I','2024-03-01','2025-09-01','Active'),
    ('NF-001','Daredevil Vision Restoration Trial','Nelson & Murdock Research','Phase II','2023-10-01','2025-10-01','Completed'),
    ('WD-001','Apocalypse Pathogen Study','CDC Alexandria Division','Phase III','2024-06-01','2027-04-01','Planned'),
    ('SU-001','Succession Cardiac Stress Trial','Waystar Royco Health','Phase I','2024-01-01','2025-07-01','Active'),
    ('QG-001','Queens Gambit Cognitive Study','Methuen Home Research','Phase II','2023-08-01','2025-05-01','Completed'),
    ('NC-001','Narcos Substance Recovery Trial','DEA Medical Division','Phase III','2024-07-01','2027-03-01','Planned'),
    ('WW-001','Westworld Neural Mapping Study','Delos Incorporated','Phase I','2024-04-15','2025-12-15','Active')
  `);
});

module.exports = { db };
