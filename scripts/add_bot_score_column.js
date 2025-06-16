const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Sökväg till din databasfil
const dbPath = path.resolve(__dirname, '../heavy_analysis.db');

// Skapa en ny databasanslutning
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the heavy_analysis database.');
});

// SQL-frågan för att lägga till den nya kolumnen
const alterTableQuery = `
ALTER TABLE player_stats
ADD COLUMN bot_score REAL DEFAULT 0.0;
`;

db.serialize(() => {
    db.run(alterTableQuery, (err) => {
        if (err) {
            // Ignorera felet om kolumnen redan finns
            if (err.message.includes('duplicate column name')) {
                console.log('Column "bot_score" already exists.');
            } else {
                console.error('Error altering table:', err.message);
            }
        } else {
            console.log('Column "bot_score" added successfully to "player_stats".');
        }
    });
});

// Stäng databasanslutningen
db.close((err) => {
    if (err) {
        console.error('Error closing database', err.message);
    } else {
        console.log('Database connection closed.');
    }
}); 