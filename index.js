const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = 'MTI1MTg4ODAzOTk0MTM3NDA4NA.GcNUpP.h9jfly_m8Rya3iI9dBk8c4G_Cy2wf6iN9Bngik';
const ATERNOS_USERNAME = 'akarbahr';
const ATERNOS_PASSWORD = 'akar2009';
const SERVER_ID = '9BDnDob0KOmrbSVG'

const OWNER_ROLE_NAME = 'Owner'; // Change this to your role name
const TARGET_CHANNEL_ID = '1251488666686193779'; // Change this to your channel ID

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

async function aternosLogin() {
    const session = axios.create({
        baseURL: 'https://aternos.org/panel/ajax',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const response = await session.post('/account/login.php', new URLSearchParams({
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
    await session.get(`/start.php?server=${SERVER_ID}`);
}

async function stopServer(session) {
    await session.get(`/stop.php?server=${SERVER_ID}`);
}

async function restartServer(session) {
    await stopServer(session);
    await startServer(session);
}

async function getServerStatus(session) {
    const statusResponse = await session.get(`/status.php?server=${SERVER_ID}`);
    return statusResponse.data;
}

// Register Slash Commands
const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Start the Aternos server'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop the Aternos server'),
    new SlashCommandBuilder().setName('restart').setDescription('Restart the Aternos server'),
    new SlashCommandBuilder()
        .setName('plugin')
        .setDescription('Owner-only: Upload a plugin (.jar file) to the Aternos server')
        .addStringOption(option =>
            option.setName('plugin_file')
                .setDescription('Attachment of the plugin (.jar file)')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Successfully reloaded application (/) commands.');

        // Periodically check server status and update bot activity
        setInterval(async () => {
            try {
                const session = await aternosLogin();
                const statusData = await getServerStatus(session);

                if (statusData.isOnline) {
                    const playerCount = statusData.players || 0;
                    client.user.setActivity(`Running ${playerCount} players in game`, { type: ActivityType.Playing });
                } else {
                    client.user.setActivity('Server Off!', { type: ActivityType.Playing });
                }
            } catch (error) {
                console.error('Failed to update server status:', error);
            }
        }, 60000); // Update every 60 seconds

    } catch (error) {
        console.error(error);
    }
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
    } else if ((command === 'stop' || command === 'restart') && member.roles.cache.some(role => role.name === OWNER_ROLE_NAME)) {
    
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

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, member, channel } = interaction;

    if (commandName === 'start' && channel.id === TARGET_CHANNEL_ID) {
        try {
            const session = await aternosLogin();
            await interaction.reply('Waiting... server is starting!');
            await startServer(session);
            await interaction.editReply('Success! Server is started. Now you can play.');
        } catch (error) {
            await interaction.editReply(`An error occurred: ${error.message}`);
        }
    } else if ((commandName === 'stop' || commandName === 'restart') && member.roles.cache.some(role => role.name === OWNER_ROLE_NAME)) {
    
        try {
            const session = await aternosLogin();
            if (commandName === 'stop') {
                await interaction.reply('Stopping server...');
                await stopServer(session);
                await interaction.editReply('Server has stopped.');
            } else if (commandName === 'restart') {
                await interaction.reply('Restarting server...');
                await restartServer(session);
                await interaction.editReply('Server has restarted.');
            }
        } catch (error) {
            await interaction.editReply(`An error occurred: ${error.message}`);
        }
    } else if (commandName === 'plugin' && member.user.id === interaction.guild.ownerId) {
        try {
            const session = await aternosLogin();

            // Get plugin file attachment
            const pluginFile = interaction.options.getString('plugin_file');
            const attachment = interaction.options.get('plugin_file').value;
            const fileBuffer = Buffer.from(attachment, 'base64'); // Decode base64 attachment

            // Upload plugin file
            const formData = new FormData();
            formData.append('upload', fileBuffer, {
                filename: pluginFile,
                knownLength: fileBuffer.length,
            });

            const uploadResponse = await session.post('/files/add.php', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Length': formData.getLengthSync(),
                },
            });

            if (uploadResponse.data && uploadResponse.data.success) {
                await interaction.reply('Plugin (.jar file) uploaded successfully!');
            } else {
                await interaction.reply('Failed to upload plugin (.jar file).');
            }
        } catch (error) {
            await interaction.reply(`An error occurred: ${error.message}`);
        }
    } else {
        await interaction.reply('Only the server owner can use this command.');
    }
});

client.login(DISCORD_TOKEN);
