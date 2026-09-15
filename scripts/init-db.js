const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'catalog.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

const schema = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
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

db.exec(schema, (err) => {
  if (err) {
    console.error('Error creating schema:', err);
    process.exit(1);
  }
  console.log('Database schema created successfully');

  // Insert sample data
  const sampleProducts = [
    {
      name: 'Warm Vanilla Sugar Body Lotion',
      sku: 'WVS-LOTION-001',
      category: 'Body Lotion',
      price: 12.50,
      quantity: 25
    },
    {
      name: 'Japanese Cherry Blossom Shower Gel',
      sku: 'JCB-SHOWER-001',
      category: 'Shower Gel',
      price: 8.00,
      quantity: 40
    },
    {
      name: 'Mahogany Teakwood 3-Wick Candle',
      sku: 'MT-CANDLE-001',
      category: 'Candle',
      price: 24.95,
      quantity: 15
    }
  ];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO products (name, sku, category, price, quantity) VALUES (?, ?, ?, ?, ?)'
  );

  sampleProducts.forEach((product) => {
    stmt.run([product.name, product.sku, product.category, product.price, product.quantity]);
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('Error inserting sample data:', err);
    } else {
      console.log('Sample data inserted successfully');
    }
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        process.exit(1);
      }
      console.log('Database initialized and connection closed');
      process.exit(0);
    });
  });
});
