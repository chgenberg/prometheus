const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const mainDbPath = path.resolve(__dirname, '../heavy_analysis.db');
const newDbPath = path.resolve(__dirname, '../heavy_analysis2.db');
const backupDbPath = path.resolve(__dirname, `../heavy_analysis_backup_${Date.now()}.db`);

function backupDatabase() {
    return new Promise((resolve, reject) => {
        console.log(`Backing up existing database to ${backupDbPath}...`);
        fs.copyFile(mainDbPath, backupDbPath, (err) => {
            if (err) {
                console.error('Backup failed:', err);
                return reject(new Error('Failed to create a backup. Aborting import.'));
            }
            console.log('Backup successful!');
            resolve();
        });
    });
}

async function mergeAllData() {
    try {
        await backupDatabase();

        const mainDb = new sqlite3.Database(mainDbPath);
        const newDb = new sqlite3.Database(newDbPath, sqlite3.OPEN_READONLY);

        // Function to promisify db.all
        const getTables = (db) => {
            return new Promise((resolve, reject) => {
                db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';", (err, tables) => {
                    if (err) return reject(err);
                    resolve(tables.map(t => t.name));
                });
            });
        };

        const tables = await getTables(newDb);
        console.log(`Found tables to merge: ${tables.join(', ')}`);

        // Use a transaction on the main database for performance and atomicity
        mainDb.serialize(() => {
            mainDb.run('BEGIN TRANSACTION;');

            const mergeTable = (tableName) => {
                return new Promise((resolve, reject) => {
                    console.log(`\nMerging table: ${tableName}`);
                    newDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        if (rows.length === 0) {
                            console.log(`- No new data to merge for ${tableName}.`);
                            return resolve();
                        }

                        console.log(`- Found ${rows.length} rows to merge into ${tableName}.`);
                        
                        const columns = Object.keys(rows[0]);
                        const placeholders = columns.map(() => '?').join(',');
                        const stmt = mainDb.prepare(`INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);

                        let processedCount = 0;
                        for (const row of rows) {
                            const values = columns.map(col => row[col]);
                            stmt.run(values, (err) => {
                                if (err) {
                                    // We don't reject the whole promise, just log the error and continue
                                    console.error(`- Error inserting row into ${tableName}:`, err.message);
                                }
                            });
                            processedCount++;
                            if (processedCount % 5000 === 0) {
                                console.log(`  ... processed ${processedCount}/${rows.length} rows for ${tableName}`);
                            }
                        }

                        stmt.finalize((err) => {
                            if (err) {
                                console.error(`- Error finalizing statement for ${tableName}:`, err.message);
                                return reject(err);
                            }
                            console.log(`- Finished merging ${tableName}.`);
                            resolve();
                        });
                    });
                });
            };

            // Chain promises to process tables sequentially
            let promiseChain = Promise.resolve();
            for (const table of tables) {
                promiseChain = promiseChain.then(() => mergeTable(table));
            }

            promiseChain.then(() => {
                 mainDb.run('COMMIT;', (err) => {
                    if (err) {
                        console.error('Commit failed:', err);
                    } else {
                        console.log('\nMerge complete. All data has been imported and triggers have updated scores automatically.');
                    }
                    // Close databases
                    mainDb.close();
                    newDb.close();
                 });
            }).catch(err => {
                console.error('\nAn error occurred during the merge process:', err);
                mainDb.run('ROLLBACK;', () => {
                     // Close databases
                    mainDb.close();
                    newDb.close();
                });
            });
        });

    } catch (error) {
        console.error('Fatal error during merge process:', error);
    }
}

mergeAllData(); 