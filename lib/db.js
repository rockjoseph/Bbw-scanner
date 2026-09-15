const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'catalog.db');
    db = new sqlite3.Database(dbPath);
    db.configure('busyTimeout', 5000);
  }
  return db;
}

function runAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { getDb, runAsync, getAsync, allAsync };
