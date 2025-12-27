import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This points to backend/database.json
const DB_PATH = path.join(__dirname, '../../database.json');

// Initialize database file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      transactions: [],
      wallets: [],
      trades: [] // <--- ADDED THIS so trading works
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Read data from database
export function readDB() {
  try {
    initDB();
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const json = JSON.parse(data);
    // Ensure trades array exists even if file was created earlier
    if (!json.trades) json.trades = []; 
    return json;
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], transactions: [], wallets: [], trades: [] };
  }
}

// Write data to database
export function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
}

// Get all records from a collection
export function getAll(collection) {
  const db = readDB();
  return db[collection] || [];
}

// Get a single record by ID
export function getById(collection, id) {
  const db = readDB();
  // Convert both to strings to ensure match
  return db[collection]?.find(item => String(item.id) === String(id));
}

// Add a new record to a collection
export function add(collection, record) {
  const db = readDB();
  if (!db[collection]) {
    db[collection] = [];
  }
  db[collection].push(record);
  writeDB(db);
  return record;
}

// Update a record in a collection
export function update(collection, id, updates) {
  const db = readDB();
  const index = db[collection]?.findIndex(item => String(item.id) === String(id));
  if (index !== -1) {
    db[collection][index] = { ...db[collection][index], ...updates };
    writeDB(db);
    return db[collection][index];
  }
  return null;
}

// Delete a record from a collection
export function remove(collection, id) {
  const db = readDB();
  const index = db[collection]?.findIndex(item => String(item.id) === String(id));
  if (index !== -1) {
    const deleted = db[collection].splice(index, 1)[0];
    writeDB(db);
    return deleted;
  }
  return null;
}

// User-specific helper methods
export function findUserByEmail(email) {
  const db = readDB();
  return db.users?.find(user => user.email === email);
}

export function createUser(userData) {
  return add('users', userData);
}

export function updateUserWallet(userId, newBalance) {
  return update('users', userId, { walletBalance: newBalance, updatedAt: new Date().toISOString() });
}