const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------
// DISCORD BOT TOKEN
// ---------------------------------------------------------
const BOT_TOKEN = 'MTUxOTQyMTEwMDYwNDI2MDM3Mg.GwoMu7.N1O0egoOfuTJJR3eBxXPWhieI01rlk8FJ-PrB0';

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname)));

// Proxy endpoint to fetch Discord User data securely
app.get('/api/member/:id', async (req, res) => {
    const userId = req.params.id.replace(/[^0-9]/g, '');

    if (!userId) {
        return res.status(400).json({ error: 'Invalid User ID' });
    }

    // Return mockup if token is not defined or is placeholder
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return res.json(getFallbackMock(userId));
    }

    try {
        const response = await fetch(`https://discord.com/api/v9/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const username = data.username || '';
            const globalName = data.global_name || username;
            const avatarHash = data.avatar;
            let avatarUrl = '';

            if (avatarHash) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=256`;
            } else {
                // Determine default avatar
                const discriminator = parseInt(data.discriminator) || 0;
                const avatarIndex = discriminator > 0 ? (discriminator % 5) : (Number(BigInt(userId) >> 22n) % 6);
                avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
            }

            return res.json({
                username,
                global_name: globalName,
                avatar_url: avatarUrl
            });
        } else {
            console.warn(`Discord API responded with status: ${response.status}`);
            return res.json(getFallbackMock(userId));
        }
    } catch (err) {
        console.error('Error fetching from Discord API:', err);
        return res.json(getFallbackMock(userId));
    }
});

function getFallbackMock(userId) {
    const mockNames = {
        '1313475119716368485': { username: 'castellan', global_name: 'Castellan Owner' },
        '578816597054193664': { username: 'admin', global_name: 'Admin User' },
        '384385365815066624': { username: 'developer', global_name: 'Developer User' }
    };
    const mock = mockNames[userId] || { username: 'ekip', global_name: 'Ekip Üyesi' };
    return {
        username: mock.username,
        global_name: mock.global_name,
        avatar_url: `https://cdn.discordapp.com/embed/avatars/${parseInt(userId.slice(-5)) % 5 || 0}.png`
    };
}

// Redirect all other queries to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started! Open http://localhost:${PORT} in your browser.`);
});
