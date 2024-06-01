const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
const path = require('path');

// Define the slash command
const commands = [
    new SlashCommandBuilder()
        .setName('draw')
        .setDescription('Generates a drawing based on a prompt')
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('The drawing prompt')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register the slash command
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
})();

// Initialize the Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'draw') {
        const prompt = interaction.options.getString('prompt');

        try {
            const response = await axios.post('https://api.openai.com/v1/images/generations', {
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const imageUrl = response.data.data[0].url;
            await interaction.reply(`Here is your drawing: ${imageUrl}`);
        } catch (error) {
            console.error('Error generating image:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
                await interaction.reply(`Error generating image: ${error.response.data.error.message}`);
            } else if (error.request) {
                console.error('No response received:', error.request);
                await interaction.reply('No response received from the API.');
            } else {
                console.error('Error setting up the request:', error.message);
                await interaction.reply('Error setting up the request.');
            }
        }
    }
});

// Create an Express application
const app = express();

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server on port 3000 or the port defined in the environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
