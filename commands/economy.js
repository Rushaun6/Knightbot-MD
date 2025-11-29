const fs = require('fs');
const path = './database.json';

// Load or initialize database
let db = {};
if (fs.existsSync(path)) {
    db = JSON.parse(fs.readFileSync(path));
} else {
    db = { users: {} };
    fs.writeFileSync(path, JSON.stringify(db, null, 2));
}

// Save DB
function saveDB() {
    fs.writeFileSync(path, JSON.stringify(db, null, 2));
}

// Ensure user exists
function ensureUser(id) {
    if (!db.users[id]) {
        db.users[id] = { wallet: 100, inventory: {}, lastDaily: 0 };
        saveDB();
    }
}

// Wallet
function getWallet(id) {
    ensureUser(id);
    return db.users[id].wallet;
}
function addCoins(id, amount) {
    ensureUser(id);
    db.users[id].wallet += amount;
    saveDB();
}
function removeCoins(id, amount) {
    ensureUser(id);
    db.users[id].wallet -= amount;
    saveDB();
}

// Slot machine
function spinSlot(id, bet) {
    ensureUser(id);
    if (bet > db.users[id].wallet) return { error: 'Not enough coins!' };

    const emojis = ['🍒','🍋','🍊','🍉','🍇','💎','⭐','🍀'];
    const result = [];
    for (let i=0;i<3;i++) result.push(emojis[Math.floor(Math.random()*emojis.length)]);

    let winnings = 0;
    if (result[0] === result[1] && result[1] === result[2]) winnings = bet * 5; // triple
    else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) winnings = bet * 2; // double

    db.users[id].wallet -= bet;
    db.users[id].wallet += winnings;
    saveDB();

    return { result, winnings };
}

// Leaderboard
function getLeaderboard() {
    const users = Object.entries(db.users)
        .sort((a,b) => b[1].wallet - a[1].wallet)
        .slice(0,10)
        .map(([id,data], idx)=>`${idx+1}. ${id} - 💰${data.wallet} coins`);
    return users.join('\n');
}

// Store
const store = {
    '🍹 Juice': 50,
    '🪄 Magic Wand': 200,
    '⚔️ Sword': 500,
};

// Buy item
function buyItem(id, item) {
    ensureUser(id);
    if (!store[item]) return '❌ Item does not exist.';
    if (db.users[id].wallet < store[item]) return '❌ Not enough coins!';
    db.users[id].wallet -= store[item];
    if (!db.users[id].inventory[item]) db.users[id].inventory[item] = 0;
    db.users[id].inventory[item] += 1;
    saveDB();
    return `✅ You bought ${item}!`;
}

// Inventory
function getInventory(id) {
    ensureUser(id);
    const items = db.users[id].inventory;
    if (Object.keys(items).length === 0) return '👜 Your inventory is empty.';
    let text = '👜 Your Inventory:\n';
    for (let item in items) text += `${item} x${items[item]}\n`;
    return text;
}

// Daily coins
function claimDaily(id) {
    ensureUser(id);
    const now = Date.now();
    const lastClaim = db.users[id].lastDaily || 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastClaim < oneDay) {
        const nextTime = new Date(lastClaim + oneDay);
        return { error: `⏰ You can claim your next daily reward at ${nextTime.toLocaleString()}` };
    }

    const reward = Math.floor(Math.random() * 100) + 50; // 50–150 coins
    db.users[id].wallet += reward;
    db.users[id].lastDaily = now;
    saveDB();
    return { reward };
}

module.exports = {
    getWallet,
    addCoins,
    removeCoins,
    spinSlot,
    getLeaderboard,
    store,
    buyItem,
    getInventory,
    claimDaily
};
