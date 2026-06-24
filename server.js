const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

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
