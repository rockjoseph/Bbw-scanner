const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { migrate } = require('./schema');

let db = null;
let ready = null;

function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'catalog.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new sqlite3.Database(dbPath);
    db.configure('busyTimeout', 5000);
    ready = migrate(db);
  }
  return db;
}

async function readyDb() {
  const instance = getDb();
  await ready;
  return instance;
}

async function runAsync(query, params = []) {
  const instance = await readyDb();
  return new Promise((resolve, reject) => {
    instance.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function getAsync(query, params = []) {
  const instance = await readyDb();
  return new Promise((resolve, reject) => {
    instance.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function allAsync(query, params = []) {
  const instance = await readyDb();
  return new Promise((resolve, reject) => {
    instance.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { getDb, runAsync, getAsync, allAsync };
