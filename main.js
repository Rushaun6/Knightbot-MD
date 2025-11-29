const fs = require('fs');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { handleTicTacToeMove } = require('./commands/tictactoe');
const { storeMessage, handleMessageRevocation } = require('./commands/antidelete');
const { handleBadwordDetection } = require('./lib/antibadword');
const { Antilink } = require('./lib/antilink');
const { handleAutoreadForMessage } = require('./commands/autoread');
const { handleChatbotResponse } = require('./commands/chatbot');
const { isBanned } = require('./lib/isBanned');
const { isSudo } = require('./lib/index');
const { isOwnerOrSudo } = require('./lib/isOwner');
const { handleAutotypingForMessage } = require('./commands/autotyping');
const store = require('./lib/lightweight_store');

// Economy commands
const { walletCommand, shopCommand, buyCommand, slotsCommand, leaderboardCommand } = require('./commands/economy');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'KnightBot MD',
            serverMessageId: -1
        }
    }
};

async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // Handle autoread
        await handleAutoreadForMessage(sock, message);

        // Store for antidelete
        storeMessage(sock, message);

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const rawText = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption || '';

        const userMessage = rawText.toLowerCase().trim();

        // Skip banned users
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            await sock.sendMessage(chatId, { text: '❌ You are banned from using the bot.', ...channelInfo }, { quoted: message });
            return;
        }

        // Increment message count
        incrementMessageCount(chatId, senderId);

        // Run moderation in groups
        if (isGroup) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        // PM blocker for non-owner private messages
        if (!isGroup && !message.key.fromMe && !(await isOwnerOrSudo(senderId))) {
            return; // skip processing
        }

        // Handle TicTacToe moves
        if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        // Only process commands starting with '.'
        if (!userMessage.startsWith('.')) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
            await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
            return;
        }

        // Economy & other commands
        switch (true) {
            // Wallet
            case userMessage === '.wallet':
                await walletCommand(sock, chatId, senderId, message);
                break;

            // Shop
            case userMessage === '.shop':
                await shopCommand(sock, chatId, message);
                break;

            // Buy item
            case userMessage.startsWith('.buy'):
                await buyCommand(sock, chatId, senderId, message, rawText);
                break;

            // Slots
            case userMessage === '.slots':
                await slotsCommand(sock, chatId, senderId, message);
                break;

            // Leaderboard
            case userMessage === '.leaderboard':
                await leaderboardCommand(sock, chatId, message);
                break;

            default:
                // Unknown command
                await sock.sendMessage(chatId, { text: `❌ Unknown command: ${rawText}`, ...channelInfo }, { quoted: message });
        }
    } catch (err) {
        console.error('Error in handleMessages:', err);
    }
}

module.exports = { handleMessages };
