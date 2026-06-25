require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 80;

// Initialize Postgres connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Discord Webhook Logger
function logToDiscord(message, type = 'info') {
    const webhookUrl = 'https://discord.com/api/webhooks/1519420130801488013/mSnuB33o-tDOI1WmIa5fvk44Xw6_VeQQ5QTFrtyF2IzOFsydoQx0b_AH4BnD7k1B11df';
    try {
        const url = new URL(webhookUrl);
        let color = 3447003; // Light blue
        if (type === 'success') color = 3066993; // Green
        if (type === 'error') color = 15158332; // Red
        if (type === 'warning') color = 15105570; // Orange
        if (type === 'stop') color = 9807270; // Grey/Dark
        
        const embed = {
            title: `CASTELLAN Sistem Logu - ${type.toUpperCase()}`,
            description: message,
            color: color,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Castellan Bot Logger'
            }
        };
        const payload = JSON.stringify({ embeds: [embed] });
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = https.request(options, (res) => {
            res.on('data', () => {});
        });
        req.on('error', (e) => {
            console.error('[WEBHOOK ERROR] Failed to send log to Discord:', e.message);
        });
        req.write(payload);
        req.end();
    } catch (e) {
        console.error('[WEBHOOK EXCEPTION] Error initializing webhook request:', e.message);
    }
}

// Parse JSON request bodies
app.use(express.json());

// ---------------------------------------------------------
// DISCORD BOT TOKEN
// ---------------------------------------------------------
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || 'MTUxOTQyMTEwMDYwNDI2MDM3Mg.GwoMu7.N1O0egoOfuTJJR3eBxXPWhieI01rlk8FJ-PrB0';

// Enable CORS so the client can query this API even if index.html is opened locally via file://
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname)));

// Proxy endpoint to fetch Discord User data securely
app.get('/api/member/:id', (req, res) => {
    const userId = req.params.id.replace(/[^0-9]/g, '');

    if (!userId) {
        return res.status(400).json({ error: 'Invalid User ID' });
    }

    // Return mockup if token is not defined or is placeholder
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        console.log(`[INFO] Token is not set. Returning fallback mock data for User: ${userId}`);
        return res.json(getFallbackMock(userId));
    }

    // Using built-in 'https' module for maximum compatibility with all Node.js versions
    const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v9/users/${userId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://github.com/expressjs/express, 1.0.0)'
        }
    };

    const request = https.request(options, (response) => {
        let rawData = '';
        
        response.on('data', (chunk) => {
            rawData += chunk;
        });
        
        response.on('end', () => {
            if (response.statusCode === 200) {
                try {
                    const data = JSON.parse(rawData);
                    const username = data.username || '';
                    const globalName = data.global_name || username;
                    const avatarHash = data.avatar;
                    let avatarUrl = '';

                    if (avatarHash) {
                        avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=256`;
                    } else {
                        // Default avatar fallback algorithm
                        const discriminator = parseInt(data.discriminator) || 0;
                        const avatarIndex = discriminator > 0 ? (discriminator % 5) : (Number(BigInt(userId) >> 22n) % 6);
                        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
                    }

                    console.log(`[SUCCESS] Fetched Discord Profile for ${globalName} (@${username})`);
                    return res.json({
                        username,
                        global_name: globalName,
                        avatar_url: avatarUrl
                    });
                } catch (e) {
                    console.error('[ERROR] JSON parsing failed:', e);
                    return res.json(getFallbackMock(userId));
                }
            } else {
                console.error(`[ERROR] Discord API returned Status Code: ${response.statusCode}`);
                if (response.statusCode === 401) {
                    console.error(`[HELP] Status 401 means your BOT_TOKEN is invalid or has been revoked by Discord!`);
                }
                return res.json(getFallbackMock(userId));
            }
        });
    });

    request.on('error', (err) => {
        console.error('[ERROR] Discord API request failed:', err.message);
        return res.json(getFallbackMock(userId));
    });

    request.end();
});

function getFallbackMock(userId) {
    const mockData = {
        '1313475119716368485': { 
            username: 'ugurrr', 
            global_name: 'uguRRR',
            avatar_url: 'https://cdn.discordapp.com/avatars/1313475119716368485/a_7291697a08708aaf3e3671bf55c59ffd.gif?size=1024&animated=true'
        },
        '578816597054193664': { 
            username: 'saruhanworld', 
            global_name: 'saruhanworld',
            avatar_url: 'https://cdn.discordapp.com/avatars/578816597054193664/a_1c3fcfca3a142790586c5c41c16842a4.gif?size=1024&animated=true'
        },
        '384385365815066624': { 
            username: 'lyuex', 
            global_name: 'lyuex',
            avatar_url: 'https://cdn.discordapp.com/avatars/384385365815066624/a_1458b46df81cd042b09c595564ee3ee6.gif?size=1024&animated=true'
        }
    };
    return mockData[userId] || { username: 'ekip', global_name: 'Ekip Üyesi', avatar_url: '' };
}

// Lightweight rate limiter to prevent key brute-forcing
const rateLimitMap = new Map();

// In-memory process mapping to track running kick.py bots by key
const runningBots = new Map();

function rateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const limitWindow = 60 * 1000; // 1 minute
    const maxRequests = 5;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip).filter(time => now - time < limitWindow);
    requests.push(now);
    rateLimitMap.set(ip, requests);

    if (requests.length > maxRequests) {
        console.warn(`[RATE LIMIT] Blocked requests from IP: ${ip}`);
        return res.status(429).json({ error: 'Çok fazla deneme yaptınız. Lütfen 1 dakika sonra tekrar deneyin.' });
    }

    next();
}

// Serve index page explicitly (with logging)
app.get('/', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logToDiscord(`Ana Sayfa ziyaret edildi.\nIP: ${ip}`, 'info');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve shop page (with logging)
app.get('/shop', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logToDiscord(`Mağaza sayfası ziyaret edildi.\nIP: ${ip}`, 'info');
    res.sendFile(path.join(__dirname, 'shop.html'));
});

// Serve control panel / status page (with logging)
app.get('/status', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = req.query.key || 'Bilinmeyen';
    logToDiscord(`Kontrol Paneli ziyaret edildi.\nAnahtar: ${key}\nIP: ${ip}`, 'info');
    res.sendFile(path.join(__dirname, 'status.html'));
});

// API: Activate Key (Supabase connected with offline fallback & rate limiter)
app.post('/api/activate', rateLimiter, async (req, res) => {
    const { licenseKey, channelName } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!licenseKey || !channelName) {
        logToDiscord(`⚠️ **Lisans Aktivasyon Girişimi Eksik Parametre**\n**IP**: ${ip}`, 'warning');
        return res.status(400).json({ error: 'Lisans anahtarı ve kanal adı boş bırakılamaz.' });
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    
    // Sanitize channel name: Strip full url domain and keep only safe alphanumeric/underscore characters to prevent XSS
    let extractedChannel = channelName.trim();
    if (extractedChannel.toLowerCase().includes('kick.com/')) {
        extractedChannel = extractedChannel.split('kick.com/')[1].split('/')[0].split('?')[0];
    }
    const cleanChannel = extractedChannel.replace(/[^a-zA-Z0-9_]/g, '');

    if (!cleanChannel) {
        logToDiscord(`⚠️ **Lisans Aktivasyon Girişimi Geçersiz Kanal**\n**Anahtar**: \`${cleanKey}\`\n**IP**: ${ip}`, 'warning');
        return res.status(400).json({ error: 'Geçersiz kanal adı girdiniz.' });
    }

    // Safety: Check if this license key is already running in memory
    if (runningBots.has(cleanKey) && runningBots.get(cleanKey).status === 'Gönderiliyor') {
        logToDiscord(`⚠️ **Mükerrer Aktivasyon Engellendi**\n**Anahtar**: \`${cleanKey}\`\n**IP**: ${ip}`, 'warning');
        return res.status(400).json({ error: 'Bu lisans anahtarı şu anda aktif olarak kullanılıyor!' });
    }

    console.log(`[ACTIVATE] Request received. Key: ${cleanKey}, Channel: ${cleanChannel}`);
    logToDiscord(`🔄 **Lisans Sorgulanıyor...**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${cleanChannel}\`\n**IP**: ${ip}`, 'info');

    try {
        // Query the database
        const queryResult = await pool.query('SELECT * FROM license_keys WHERE key = $1', [cleanKey]);
        
        if (queryResult.rows.length === 0) {
            logToDiscord(`❌ **Lisans Aktivasyon Başarısız**\n**Anahtar**: \`${cleanKey}\`\n**Sebep**: Lisans anahtarı bulunamadı.\n**IP**: ${ip}`, 'error');
            return res.status(404).json({ error: 'Lisans anahtarı bulunamadı.' });
        }

        const keyRecord = queryResult.rows[0];

        if (parseInt(keyRecord.used) === 1) {
            logToDiscord(`❌ **Lisans Aktivasyon Başarısız**\n**Anahtar**: \`${cleanKey}\`\n**Sebep**: Lisans zaten kullanılmış.\n**IP**: ${ip}`, 'error');
            return res.status(400).json({ error: 'Bu lisans anahtarı zaten kullanılmış!' });
        }

        // Update the key in database
        await pool.query(
            'UPDATE license_keys SET used = 1, satinalanpc = $1, kullanimtarihi = NOW() WHERE key = $2',
            [cleanChannel, cleanKey]
        );

        console.log(`[SUCCESS] Activated key ${cleanKey} for channel @${cleanChannel}`);

        // Launch kick.py in the background
        const { spawn } = require('child_process');
        const botProcess = spawn('python', [
            'kick.py',
            '-c', cleanChannel,
            '-n', keyRecord.miktar,
            '--auto-start'
        ], {
            detached: true,
            stdio: 'ignore',
            cwd: __dirname
        });
        botProcess.unref();

        // Track process in memory
        runningBots.set(cleanKey, {
            key: cleanKey,
            channel: cleanChannel,
            targetViewers: keyRecord.miktar,
            startTime: Date.now(),
            process: botProcess,
            status: 'Gönderiliyor'
        });

        // Listen for process exit to keep status updated
        botProcess.on('exit', (code) => {
            console.log(`[BOT EXIT] Key: ${cleanKey}, Code: ${code}`);
            const bot = runningBots.get(cleanKey);
            if (bot && bot.status === 'Gönderiliyor') {
                bot.status = 'Durduruldu';
            }
            logToDiscord(`⚠️ **İzleyici Botu Süreci Durdu (Supabase)**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${cleanChannel}\`\n**Çıkış Kodu**: \`${code}\``, 'warning');
        });

        console.log(`[SPAWN] Started Kick Viewer Bot for @${cleanChannel} with ${keyRecord.miktar} viewers (PID: ${botProcess.pid}).`);
        logToDiscord(`🚀 **Lisans başarıyla aktifleştirildi!**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${cleanChannel}\`\n**Miktar**: \`${keyRecord.miktar} İzleyici\`\n**PID**: \`${botProcess.pid}\``, 'success');

        return res.json({
            success: true,
            packageName: `KICK ${keyRecord.miktar} İzleyici`
        });
    } catch (err) {
        console.error('[DATABASE ERROR] Supabase query failed. Falling back to local offline validation...', err.message);
        logToDiscord(`⚡ **Supabase Bağlantı Hatası (Çevrimdışı Moda Geçiliyor)**\n**Hata**: ${err.message}`, 'warning');
        
        // Local mockup fallback
        const mockKeys = {
            'CAST-KICK-50': 50,
            'CAST-KICK-150': 150,
            'CAST-KICK-400': 400,
            'SARU-KEY-999': 400,
            'UGUR-KEY-777': 150
        };

        if (mockKeys[cleanKey] !== undefined) {
            const miktar = mockKeys[cleanKey];
            console.log(`[FALLBACK SUCCESS] Local key validated: ${cleanKey}`);

            // Launch kick.py in the background even in offline mode
            const { spawn } = require('child_process');
            const botProcess = spawn('python', [
                'kick.py',
                '-c', cleanChannel,
                '-n', miktar,
                '--auto-start'
            ], {
                detached: true,
                stdio: 'ignore',
                cwd: __dirname
            });
            botProcess.unref();

            // Track process in memory (offline)
            runningBots.set(cleanKey, {
                key: cleanKey,
                channel: cleanChannel,
                targetViewers: miktar,
                startTime: Date.now(),
                process: botProcess,
                status: 'Gönderiliyor'
            });

            botProcess.on('exit', (code) => {
                console.log(`[BOT EXIT FALLBACK] Key: ${cleanKey}, Code: ${code}`);
                const bot = runningBots.get(cleanKey);
                if (bot && bot.status === 'Gönderiliyor') {
                    bot.status = 'Durduruldu';
                }
                logToDiscord(`⚠️ **İzleyici Botu Süreci Durdu (Çevrimdışı Mod)**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${cleanChannel}\`\n**Çıkış Kodu**: \`${code}\``, 'warning');
            });

            console.log(`[SPAWN FALLBACK] Started Kick Viewer Bot for @${cleanChannel} with ${miktar} viewers (PID: ${botProcess.pid}).`);
            logToDiscord(`🚀 **Lisans başarıyla aktifleştirildi (Çevrimdışı Mod)!**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${cleanChannel}\`\n**Miktar**: \`${miktar} İzleyici\`\n**PID**: \`${botProcess.pid}\``, 'success');

            return res.json({
                success: true,
                packageName: `KICK ${miktar} İzleyici (Çevrimdışı Mod)`
            });
        } else {
            logToDiscord(`❌ **Lisans Aktivasyon Başarısız (Çevrimdışı Mod)**\n**Anahtar**: \`${cleanKey}\`\n**Sebep**: Lisans anahtarı bulunamadı.\n**IP**: ${ip}`, 'error');
            return res.status(404).json({ error: 'Lisans anahtarı bulunamadı (Çevrimdışı Mod).' });
        }
    }
});

// API: Get Bot Status & Injection Progress
app.get('/api/bot-status', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'Lisans anahtarı belirtilmedi.' });
    }
    const cleanKey = key.trim().toUpperCase();

    // 1. Check in-memory running processes first
    if (runningBots.has(cleanKey)) {
        const bot = runningBots.get(cleanKey);
        
        // Calculate status details
        const elapsedSeconds = Math.floor((Date.now() - bot.startTime) / 1000);
        
        // Ramp up simulation: reaching 100% in 30 seconds
        const rampDuration = 30; 
        let percent = 0;
        if (bot.status === 'Gönderiliyor') {
            percent = Math.min(100, Math.floor((elapsedSeconds / rampDuration) * 100));
        } else {
            percent = 100;
        }

        let currentViewers = 0;
        if (bot.status === 'Gönderiliyor') {
            currentViewers = Math.floor((percent / 100) * bot.targetViewers);
            // Fluctuates slightly at 100% to look realistic
            if (percent === 100) {
                const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
                currentViewers = Math.max(1, bot.targetViewers + fluctuation);
            }
        }

        return res.json({
            key: bot.key,
            channel: bot.channel,
            targetViewers: bot.targetViewers,
            currentViewers: currentViewers,
            percent: percent,
            elapsed: elapsedSeconds,
            status: bot.status
        });
    }

    // 2. If not running in memory, check database
    try {
        const queryResult = await pool.query('SELECT * FROM license_keys WHERE key = $1', [cleanKey]);
        if (queryResult.rows.length > 0) {
            const keyRecord = queryResult.rows[0];
            if (parseInt(keyRecord.used) === 1) {
                return res.json({
                    key: cleanKey,
                    channel: keyRecord.satinalanpc || 'bilinmeyen',
                    targetViewers: keyRecord.miktar,
                    currentViewers: 0,
                    percent: 100,
                    elapsed: 0,
                    status: 'Durduruldu'
                });
            } else {
                return res.status(404).json({ error: 'Bu lisans anahtarı henüz aktive edilmemiş.' });
            }
        }
    } catch (dbErr) {
        console.error('[STATUS DB FALLBACK] Checking local keys...');
    }

    // 3. Mock keys fallback (offline testing)
    const mockKeys = {
        'CAST-KICK-50': 50,
        'CAST-KICK-150': 150,
        'CAST-KICK-400': 400,
        'SARU-KEY-999': 400,
        'UGUR-KEY-777': 150
    };
    if (mockKeys[cleanKey] !== undefined) {
        return res.json({
            key: cleanKey,
            channel: 'demo_kanal',
            targetViewers: mockKeys[cleanKey],
            currentViewers: 0,
            percent: 0,
            elapsed: 0,
            status: 'Durduruldu'
        });
    }

    return res.status(404).json({ error: 'Lisans anahtarı geçerli değil.' });
});

// API: Stop Bot Process
app.post('/api/stop-bot', async (req, res) => {
    const { licenseKey } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!licenseKey) {
        logToDiscord(`⚠️ **Lisans Durdurma Girişimi Eksik Parametre**\n**IP**: ${ip}`, 'warning');
        return res.status(400).json({ error: 'Lisans anahtarı boş olamaz.' });
    }
    const cleanKey = licenseKey.trim().toUpperCase();

    console.log(`[STOP] Stop request received for key: ${cleanKey}`);

    if (runningBots.has(cleanKey)) {
        const bot = runningBots.get(cleanKey);
        
        if (bot.status === 'Gönderiliyor' && bot.process) {
            const pid = bot.process.pid;
            console.log(`[KILL] Terminating process PID: ${pid} for key ${cleanKey}`);
            
            try {
                if (process.platform === 'win32') {
                    const { exec } = require('child_process');
                    exec(`taskkill /pid ${pid} /T /F`, (err) => {
                        if (err) {
                            console.error(`[KILL ERROR] taskkill failed: ${err.message}`);
                            try { bot.process.kill(); } catch (e) {}
                        } else {
                            console.log(`[KILL SUCCESS] taskkill succeeded for PID ${pid}`);
                        }
                    });
                } else {
                    bot.process.kill('SIGINT');
                }
            } catch (err) {
                console.error(`[KILL EXCEPTION] Error killing process: ${err.message}`);
            }

            bot.status = 'Durduruldu';
        }

        // Update database: set used = 0 so key becomes reusable!
        try {
            await pool.query('UPDATE license_keys SET used = 0, satinalanpc = NULL, kullanimtarihi = NULL WHERE key = $1', [cleanKey]);
            console.log(`[DATABASE UPDATE] Key ${cleanKey} set back to unused.`);
        } catch (dbErr) {
            console.error('[DATABASE UPDATE ERROR] Failed to set key to unused:', dbErr.message);
        }

        logToDiscord(`🛑 **Gönderim Durduruldu (Kullanıcı Talebi)**\n**Anahtar**: \`${cleanKey}\`\n**Kanal**: \`kick.com/${bot.channel}\`\n**Hedef**: \`${bot.targetViewers} İzleyici\`\n**IP**: ${ip}`, 'stop');

        return res.json({ success: true, message: 'Gönderim başarıyla durduruldu.' });
    }

    // If not running in memory but exists in database, reset it to unused
    try {
        const queryResult = await pool.query('SELECT * FROM license_keys WHERE key = $1', [cleanKey]);
        if (queryResult.rows.length > 0) {
            await pool.query('UPDATE license_keys SET used = 0, satinalanpc = NULL, kullanimtarihi = NULL WHERE key = $1', [cleanKey]);
            logToDiscord(`🛑 **Lisans Pasife Çekildi (Veritabanı)**\n**Anahtar**: \`${cleanKey}\`\n**IP**: ${ip}`, 'stop');
            return res.json({ success: true, message: 'Lisans veritabanında pasife çekildi.' });
        }
    } catch (dbErr) {
        console.error('[STOP DB FALLBACK] Check failed');
    }

    logToDiscord(`⚠️ **Durdurma Girişimi Başarısız**\n**Anahtar**: \`${cleanKey}\`\n**Sebep**: Aktif çalışan bot veya lisans bulunamadı.\n**IP**: ${ip}`, 'warning');
    return res.status(404).json({ error: 'Aktif çalışan bot veya geçerli lisans bulunamadı.' });
});

// Redirect all other queries to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`Server started successfully!`);
    console.log(`Open http://localhost:${PORT} in your browser to view the site.`);
    console.log(`======================================================\n`);
});
