const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// Initialize database
const db = new Database('aidconnect.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist - run synchronously so prepare() below succeeds
function ensureTables() {
    // Users table (for admin authentication)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Requests table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT,
            posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            amount_needed INTEGER NOT NULL,
            priority TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            submitted_by TEXT NOT NULL
        )
    `).run();

    // Donations table with foreign key to requests
    db.prepare(`
        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            donor_name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            donated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id)
        )
    `).run();
}

// Ensure tables now (synchronous)
ensureTables();

// Create admin user if it doesn't exist
async function createInitialAdmin() {
    const adminUser = {
        username: 'admin',
        password: 'admin123', // Change after first run
        role: 'admin'
    };

    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser.username);
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
            adminUser.username,
            hashedPassword,
            adminUser.role
        );
        console.log('Created initial admin user (admin/admin123)');
    }
}

// Migrate existing data from data.json if it exists
async function migrateDataFromJson() {
    try {
        const dataPath = path.join(__dirname, 'data.json');
        const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

        // Only migrate if tables are empty
        const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get().count;
        if (requestCount === 0 && Array.isArray(data.requests)) {
            const insertRequest = db.prepare(`
                INSERT INTO requests (
                    id, title, description, location, amount_needed,
                    priority, status, submitted_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insert = db.transaction((requests) => {
                for (const req of requests) {
                    insertRequest.run(
                        req.id,
                        req.title,
                        req.description,
                        req.location,
                        req.amountNeeded,
                        req.priority,
                        req.status || 'pending',
                        req.submittedBy || 'Unknown'
                    );
                }
            });

            insert(data.requests);
            console.log('Migrated requests from data.json');
        }

        const donationCount = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;
        if (donationCount === 0 && Array.isArray(data.donations)) {
            const insertDonation = db.prepare(`
                INSERT INTO donations (
                    request_id, donor_name, amount, donated_at
                ) VALUES (?, ?, ?, ?)
            `);

            const insertD = db.transaction((donations) => {
                for (const don of donations) {
                    insertDonation.run(
                        don.requestId,
                        don.donorName,
                        don.amount,
                        don.date
                    );
                }
            });

            insertD(data.donations);
            console.log('Migrated donations from data.json');
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error migrating data:', err);
        }
    }
}

// Initialize everything (create admin and migrate) - return a promise
async function initialize() {
    await createInitialAdmin();
    await migrateDataFromJson();
}

// Prepare commonly used queries (safe now because tables exist)
const queries = {
    // Requests
    getAllRequests: db.prepare('SELECT * FROM requests ORDER BY posted_at DESC'),
    getPendingRequests: db.prepare("SELECT * FROM requests WHERE status = 'pending' ORDER BY posted_at DESC"),
    insertRequest: db.prepare(`
        INSERT INTO requests (title, description, location, amount_needed, priority, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateRequestStatus: db.prepare('UPDATE requests SET status = ? WHERE id = ?'),
    getRequestById: db.prepare('SELECT * FROM requests WHERE id = ?'),

    // Donations
    insertDonation: db.prepare(`
        INSERT INTO donations (request_id, donor_name, amount)
        VALUES (?, ?, ?)
    `),
    getDonationsByRequestId: db.prepare('SELECT * FROM donations WHERE request_id = ?'),
    getAllDonations: db.prepare('SELECT * FROM donations ORDER BY donated_at DESC'),

    // Users/Auth
    getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?')
};

module.exports = { db, queries, initialize };