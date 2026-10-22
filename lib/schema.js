const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  category TEXT,
  location TEXT,
  price REAL,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  supplier TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity_change INTEGER,
  reason TEXT,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_log_product ON inventory_log(product_id);
`;

// Columns added after the first release; applied to existing databases.
const ADDED_COLUMNS = [
  ['barcode', 'TEXT'],
  ['location', 'TEXT'],
];

const POST_MIGRATION = `
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_location ON products(location);
`;

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function all(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function migrate(db) {
  await exec(db, SCHEMA);
  const columns = (await all(db, 'PRAGMA table_info(products)')).map((c) => c.name);
  for (const [name, type] of ADDED_COLUMNS) {
    if (!columns.includes(name)) {
      await exec(db, `ALTER TABLE products ADD COLUMN ${name} ${type}`);
    }
  }
  await exec(db, POST_MIGRATION);
}

module.exports = { migrate };
