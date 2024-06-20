const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Replace with your own Discord bot token
const DISCORD_TOKEN = process.env.t;

// Replace with your Aternos credentials
const ATERNOS_SESSION = 'yWs5nOTUuKooMRkVVKMGY9BjWpChCqKdpYFGEVXyyLcCEH54qcZY3AvnZpbEjMAPCVwoczz1nnTU4RnVFTWwWCriIITBc2zHd6LD';
const ATERNOS_SERVER = '2zgC53kIbUdB4rHv';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

async function startServer() {
    const url = `https://aternos.org/panel/ajax/start.php`;
    const headers = {
        Cookie: `ATERNOS_SESSION=${ATERNOS_SESSION}`
    };
    const params = new URLSearchParams();
    params.append('SER', ATERNOS_SERVER);

    try {
        const response = await axios.post(url, params, { headers });
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function stopServer() {
    const url = `https://aternos.org/panel/ajax/stop.php`;
    const headers = {
        Cookie: `ATERNOS_SESSION=${ATERNOS_SESSION}`
    };
    const params = new URLSearchParams();
    params.append('SER', ATERNOS_SERVER);

    try {
        const response = await axios.post(url, params, { headers });
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!start') {
        const response = await startServer();
        if (response) {
            message.channel.send('Starting server...');
        } else {
            message.channel.send('Failed to start server.');
        }
    } else if (message.content === '!stop') {
        const response = await stopServer();
        if (response) {
            message.channel.send('Stopping server...');
        } else {
            message.channel.send('Failed to stop server.');
        }
    }
});

client.login(DISCORD_TOKEN);
