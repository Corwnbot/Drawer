const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const qs = require('qs');

const DISCORD_TOKEN = process.env.t;
const ATERNOS_USERNAME = 'akarbahr';
const ATERNOS_PASSWORD = 'akar2009';
const SERVER_ID = '9BDnDob0KOmrbSVG';
const TARGET_CHANNEL_ID = '1251488666686193779';
const OWNER_ROLE_ID = '1253242456783327325';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

async function aternosLogin() {
    const session = axios.create({
        baseURL: 'https://aternos.org/panel/ajax',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const response = await session.post('/account/login.php', qs.stringify({
        user: ATERNOS_USERNAME,
        password: ATERNOS_PASSWORD
    }));

    if (response.data.success) {
        return session;
    } else {
        throw new Error('Failed to log in to Aternos');
    }
}

async function startServer(session) {
    const response = await session.get(`/start.php?server=${SERVER_ID}`);
    if (response.status !== 200) {
        throw new Error('Failed to start server');
    }
}

async function stopServer(session) {
    const response = await session.get(`/stop.php?server=${SERVER_ID}`);
    if (response.status !== 200) {
        throw new Error('Failed to stop server');
    }
}

async function restartServer(session) {
    await stopServer(session);
    await startServer(session);
}

async function getServerStatus(session) {
    const statusResponse = await session.get(`/status.php?server=${SERVER_ID}`);
    if (statusResponse.status !== 200) {
        throw new Error('Failed to get server status');
    }
    return statusResponse.data;
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    setInterval(async () => {
        try {
            const session = await aternosLogin();
            const statusData = await getServerStatus(session);

            if (statusData.isOnline) {
                const playerCount = statusData.players || 0;
                client.user.setActivity(`Running ${playerCount} players in game`, { type: 'PLAYING' });
            } else {
                client.user.setActivity('Server Off!', { type: 'PLAYING' });
            }
        } catch (error) {
            console.error('Failed to update server status:', error);
        }
    }, 60000); // Update every 60 seconds
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member = message.member;

    if (command === 'start' && message.channel.id === TARGET_CHANNEL_ID) {
        try {
            const session = await aternosLogin();
            const responseMessage = await message.channel.send('Waiting... server is starting!');
            await startServer(session);
            await responseMessage.edit('Success! Server is started. Now you can play.');
        } catch (error) {
            await message.channel.send(`An error occurred: ${error.message}`);
        }
    } else if ((command === 'stop' || command === 'restart') && member.roles.cache.has(OWNER_ROLE_ID)) {
        try {
            const session = await aternosLogin();
            if (command === 'stop') {
                const responseMessage = await message.channel.send('Stopping server...');
                await stopServer(session);
                await responseMessage.edit('Server has stopped.');
            } else if (command === 'restart') {
                const responseMessage = await message.channel.send('Restarting server...');
                await restartServer(session);
                await responseMessage.edit('Server has restarted.');
            }
        } catch (error) {
            await message.channel.send(`An error occurred: ${error.message}`);
        }
    } else {
        await message.channel.send('You do not have permission to use this command or you are using it in the wrong channel.');
    }
});

client.login(DISCORD_TOKEN);
