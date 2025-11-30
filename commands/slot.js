const fs = require('fs');
const path = require('path');

// Make sure storage folder exists
const dbFolder = path.join(__dirname, '../storage');
const dbPath = path.join(dbFolder, 'economy.json');

if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

function loadDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function slotCommand(sock, chatId, senderId, message) {
    const db = loadDB();

    if (!db[senderId]) {
        db[senderId] = { balance: 0 };
    }

    const user = db[senderId];

    if (user.balance < 50) {
        await sock.sendMessage(chatId, { 
            text: "You need at least *50 coins* to spin the slot machine!", 
        }, { quoted: message });
        return;
    }

    const items = ["🍒", "🍋", "🍉", "⭐", "🔔"];
    const slot1 = items[Math.floor(Math.random() * items.length)];
    const slot2 = items[Math.floor(Math.random() * items.length)];
    const slot3 = items[Math.floor(Math.random() * items.length)];

    let resultText = `🎰 *Slot Machine* 🎰\n\n${slot1} | ${slot2} | ${slot3}\n\n`;

    if (slot1 === slot2 && slot2 === slot3) {
        user.balance += 200;
        resultText += `🎉 JACKPOT!!! You won *200 coins*!`;
    } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        user.balance += 50;
        resultText += `🔥 Nice! You won *50 coins*!`;
    } else {
        user.balance -= 50;
        resultText += `😢 You lost *50 coins*! Better luck next time.`;
    }

    saveDB(db);

    await sock.sendMessage(chatId, { 
        text: resultText 
    }, { quoted: message });
}

module.exports = slotCommand;
