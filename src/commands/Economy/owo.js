const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= [ زانیارییە گرنگەکان ] =================
const PREFIX = 'owo ';
const MAIN_SERVER_ID = 'YOUR_MAIN_SERVER_ID'; // ئایدی سێرڤەرە تایبەتەکەی خۆت لێرە دابنێ

// داتابەیسی کاتی لە memory (بۆ پاشەکەوتکردنی هەمیشەیی دەتوانیت Quick.db یان MongoDB بەکاربهێنیت)
const db = {
    users: {} // { userId: { cash: 100, zoo: [], lastDaily: 0, lastHunt: 0 } }
};

// فەنکشن بۆ دروستکردنی پرۆفایلی بەکارهێنەر ئەگەر بوونی نەبێت
function getUserData(userId) {
    if (!db.users[userId]) {
        db.users[userId] = {
            cash: 0,
            zoo: [],
            lastDaily: 0,
            lastHunt: 0
        };
    }
    return db.users[userId];
}

// لیستی ئاژەڵەکان بۆ ڕاوکردن
const animals = [
    { name: '🐶 Dog', rarity: 'Common' },
    { name: '🐱 Cat', rarity: 'Common' },
    { name: '🐰 Rabbit', rarity: 'Common' },
    { name: '🦊 Fox', rarity: 'Uncommon' },
    { name: '🐻 Bear', rarity: 'Uncommon' },
    { name: '🦁 Lion', rarity: 'Rare' },
    { name: '🦄 Unicorn', rarity: 'Epic' },
    { name: '🐲 Dragon', rarity: 'Mythic' }
];

client.on('ready', () => {
    console.log(`🤖 Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.toLowerCase();

    // ================= [ ۱. کۆماندی ئادمین (تەنها لە سێرڤەری سەرەکی) ] =================
    if (content.startsWith('!addmoney')) {
        // پشکنینی سێرڤەر
        if (message.guild.id !== MAIN_SERVER_ID) {
            return message.reply('❌ ئەم کۆماندە تەنها لە سێرڤەری سەرەکی بۆتەکە کار دەکات!');
        }

        // پشکنینی دەسەڵاتی ئادمین
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ تۆ دەسەڵاتی ئادمیانت نییە!');
        }

        const args = message.content.split(' ').slice(1);
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount)) {
            return message.reply('⚠️ شێوازی هەڵە! نموونە: `!addmoney @user 5000`');
        }

        const user = getUserData(target.id);
        user.cash += amount;

        return message.reply(`✅ بە سەرکەوتوویی بڕی **${amount}** کۆین درا بە ${target}!`);
    }

    // ================= [ ۲. کۆماندەکانی OWO ] =================
    if (!content.startsWith(PREFIX) && content !== 'owo') return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // --- A. Hunt (ڕاوکردنی ئاژەڵ) ---
    if (command === 'hunt' || command === 'h') {
        const user = getUserData(message.author.id);
        const now = Date.now();
        const cooldown = 15000; // 15 چرکە

        if (now - user.lastHunt < cooldown) {
            const timeLeft = ((cooldown - (now - user.lastHunt)) / 1000).toFixed(1);
            return message.reply(`⏱️ تکایە **${timeLeft}** چرکەی تر چاوەڕێ بکە!`);
        }

        user.lastHunt = now;
        const caughtAnimal = animals[Math.floor(Math.random() * animals.length)];
        user.zoo.push(caughtAnimal.name);

        return message.reply(`🎣 **${message.author.username}** دەستت کەوت: **${caughtAnimal.name}** (${caughtAnimal.rarity})!`);
    }

    // --- B. Zoo (کۆگای ئاژەڵەکان) ---
    if (command === 'zoo') {
        const user = getUserData(message.author.id);
        if (user.zoo.length === 0) {
            return message.reply('🐺 تۆ هیچ ئاژەڵێکت نییە! کۆماندی `owo hunt` بەکاربهێنە.');
        }

        const animalCounts = {};
        user.zoo.forEach(animal => {
            animalCounts[animal] = (animalCounts[animal] || 0) + 1;
        });

        let zooList = Object.entries(animalCounts)
            .map(([animal, count]) => `${animal} x${count}`)
            .join('\n');

        return message.reply(`📜 **باخچەی ئاژەڵانی ${message.author.username}:**\n${zooList}`);
    }

    // --- C. Cash / Balance (بینینی پارە) ---
    if (command === 'cash' || command === 'bal') {
        const user = getUserData(message.author.id);
        return message.reply(`💰 **${message.author.username}**، باڵانسی ئێستات: **${user.cash}** کۆین.`);
    }

    // --- D. Coinflip (شێر و خەت) ---
    if (command === 'coinflip' || command === 'cf') {
        const amount = parseInt(args[0]);
        const choice = args[1]?.toLowerCase();

        if (isNaN(amount) || amount <= 0 || !['h', 't', 'heads', 'tails'].includes(choice)) {
            return message.reply('⚠️ شێوازی هەڵە! نموونە: `owo cf 100 h` یان `owo cf 100 t`');
        }

        const user = getUserData(message.author.id);
        if (user.cash < amount) {
            return message.reply('❌ پارەی پێویستت نییە!');
        }

        const outcomes = ['h', 't'];
        const result = outcomes[Math.floor(Math.random() * outcomes.length)];
        const userChoice = choice.startsWith('h') ? 'h' : 't';

        if (result === userChoice) {
            user.cash += amount;
            return message.reply(`🪙 دراوەکە کەوتە سەر **${result === 'h' ? 'Heads' : 'Tails'}**! تۆ **${amount}** کۆینت بردەوە! 🎉`);
        } else {
            user.cash -= amount;
            return message.reply(`🪙 دراوەکە کەوتە سەر **${result === 'h' ? 'Heads' : 'Tails'}**! تۆ **${amount}** کۆینت دۆڕاند! 😿`);
        }
    }

    // --- E. Give (ناردنی پارە بۆ هاوڕێ) ---
    if (command === 'give' || command === 'send') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply('⚠️ شێوازی هەڵە! نموونە: `owo give @user 100`');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ ناتوانیت پارە بۆ خۆت بنێریت!');
        }

        const sender = getUserData(message.author.id);
        const receiver = getUserData(target.id);

        if (sender.cash < amount) {
            return message.reply('❌ پارەی پێویستت نییە بۆ ناردن!');
        }

        sender.cash -= amount;
        receiver.cash += amount;

        return message.reply(`💸 بە سەرکەوتوویی بڕی **${amount}** کۆینت نارد بۆ ${target}!`);
    }

    // --- F. Daily (پاداشتی ڕۆژانە) ---
    if (command === 'daily') {
        const user = getUserData(message.author.id);
        const now = Date.now();
        const cooldown = 86400000; // 24 کاتژمێر

        if (now - user.lastDaily < cooldown) {
            const hoursLeft = ((cooldown - (now - user.lastDaily)) / (1000 * 60 * 60)).toFixed(1);
            return message.reply(`📅 تۆ پاداشتی ڕۆژانەت وەرگرتووە! **${hoursLeft}** کاتژمێری تر وەرە بۆ پاداشتی نوێ.`);
        }

        const reward = 500;
        user.cash += reward;
        user.lastDaily = now;

        return message.reply(`🎁 پاداشتی ڕۆژانە! بڕی **${reward}** کۆینت وەرگرت.`);
    }
});

// توکنەکە لە Railway لە Environment Variables دیاری بکە بە ناوی BOT_TOKEN
client.login(process.env.BOT_TOKEN);
