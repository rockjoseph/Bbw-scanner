const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { migrate } = require('../lib/schema');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'catalog.db');

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

migrate(db).then(() => {
  console.log('Database schema created successfully');

  // Insert sample data
  const sampleProducts = [
    {
      name: 'Warm Vanilla Sugar Body Lotion',
      sku: 'WVS-LOTION-001',
      barcode: '667556602171',
      category: 'Body Lotion',
      location: 'Aisle 1 - Shelf A',
      price: 12.50,
      quantity: 25
    },
    {
      name: 'Japanese Cherry Blossom Shower Gel',
      sku: 'JCB-SHOWER-001',
      barcode: '667556602188',
      category: 'Shower Gel',
      location: 'Aisle 1 - Shelf B',
      price: 8.00,
      quantity: 40
    },
    {
      name: 'Mahogany Teakwood 3-Wick Candle',
      sku: 'MT-CANDLE-001',
      barcode: '667556602195',
      category: 'Candle',
      location: 'Back Room - Bin 3',
      price: 24.95,
      quantity: 15
    }
  ];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO products (name, sku, barcode, category, location, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  sampleProducts.forEach((product) => {
    stmt.run([product.name, product.sku, product.barcode, product.category, product.location, product.price, product.quantity]);
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
}).catch((err) => {
  console.error('Error creating schema:', err);
  process.exit(1);
});
