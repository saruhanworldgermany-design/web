require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionStringWithoutBrackets = "postgresql://postgres:Sevdam123+-+@db.nrganwstmdxjpeyqcffw.supabase.co:5432/postgres";
const connectionStringWithBrackets = "postgresql://postgres:[Sevdam123+-+]@db.nrganwstmdxjpeyqcffw.supabase.co:5432/postgres";

async function runSetup() {
    let client;
    let selectedConnString = connectionStringWithoutBrackets;
    
    console.log("Connecting to Supabase Postgres database...");
    
    // Attempt 1: Without brackets
    try {
        client = new Client({ connectionString: connectionStringWithoutBrackets });
        await client.connect();
        console.log("[SUCCESS] Connected using password without brackets.");
    } catch (err) {
        console.log("[INFO] Connection failed without brackets. Trying with brackets...");
        // Attempt 2: With brackets
        try {
            client = new Client({ connectionString: connectionStringWithBrackets });
            await client.connect();
            selectedConnString = connectionStringWithBrackets;
            console.log("[SUCCESS] Connected using password with brackets. Updating .env file...");
            
            // Update .env file
            const envContent = `DATABASE_URL=${connectionStringWithBrackets}\nPORT=3000\n`;
            fs.writeFileSync(path.join(__dirname, '.env'), envContent);
        } catch (err2) {
            console.error("[FATAL] Could not connect to Postgres with either password format!");
            console.error("Attempt 1 Error:", err.message);
            console.error("Attempt 2 Error:", err2.message);
            process.exit(1);
        }
    }

    try {
        console.log("Creating table 'license_keys' with exact schema...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS license_keys (
                id SERIAL PRIMARY KEY,
                satinalanpc VARCHAR(255),
                key VARCHAR(255) UNIQUE NOT NULL,
                miktar INT DEFAULT 0,
                tarih TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                kullanimtarihi TIMESTAMP WITH TIME ZONE,
                used INT DEFAULT 0
            );
        `);
        console.log("[SUCCESS] Table structure verified.");

        console.log("Seeding sample keys...");
        const sampleKeys = [
            { key: 'CAST-KICK-50', miktar: 50 },
            { key: 'CAST-KICK-150', miktar: 150 },
            { key: 'CAST-KICK-400', miktar: 400 },
            { key: 'SARU-KEY-999', miktar: 400 },
            { key: 'UGUR-KEY-777', miktar: 150 }
        ];

        for (const item of sampleKeys) {
            // Check if key already exists
            const res = await client.query('SELECT key FROM license_keys WHERE key = $1', [item.key]);
            if (res.rows.length === 0) {
                await client.query(
                    'INSERT INTO license_keys (key, miktar, used) VALUES ($1, $2, 0)',
                    [item.key, item.miktar]
                );
                console.log(`[SEED] Inserted key: ${item.key} -> ${item.miktar} izleyici`);
            } else {
                console.log(`[SEED] Key already exists, skipping: ${item.key}`);
            }
        }
        
        console.log("\n======================================================");
        console.log("[ALL DONE] Database is initialized successfully!");
        console.log("======================================================\n");
    } catch (err) {
        console.error("[ERROR] Failed to run database setup queries:", err.message);
    } finally {
        await client.end();
    }
}

runSetup();
