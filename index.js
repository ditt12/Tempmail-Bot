const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const express = require('express');
const app = express();

const bot = new Telegraf('TOKEN');

let tempMail = null;
let userIds = new Set(); // Untuk menyimpan ID pengguna
const OWNER_ID = CHANGE_TO_OWNER_ID; // Ganti dengan ID Telegram pemilik bot

// Function to generate a new temp mail
async function generateTempMail() {
    try {
        const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        if (!response.ok) {
            throw new Error('Failed to generate temp mail');
        }
        const emails = await response.json();
        return emails[0];
    } catch (error) {
        console.error('Error generating temp mail:', error);
        throw error;
    }
}

// Function to check inbox
async function checkInbox(email) {
    try {
        const username = email.split('@')[0];
        const domain = email.split('@')[1];
        const response = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`);
        if (!response.ok) {
            throw new Error('Failed to fetch inbox');
        }
        const data = await response.json();
        console.log('Inbox Data:', data); // Log data received from API
        return data;
    } catch (error) {
        console.error('Error fetching inbox:', error);
        throw error;
    }
}

// Function to fetch email details
async function getMessage(email, messageId) {
    try {
        const username = email.split('@')[0];
        const domain = email.split('@')[1];
        const response = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${messageId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch message details');
        }
        const data = await response.json();
        console.log('Email Details:', data); // Log details of the email
        return data;
    } catch (error) {
        console.error('Error fetching message:', error);
        throw error;
    }
}

// Command when bot starts
bot.start((ctx) => {
    userIds.add(ctx.from.id); // Menyimpan ID pengguna
    const keyboard = ctx.from.id === CHANGE_TO_OWNER_ID ? [
        ['Buat Temp Mail', 'Ganti Temp Mail'],
        ['Cek Inbox', 'Broadcast']
    ] : [
        ['Buat Temp Mail', 'Ganti Temp Mail'],
        ['Cek Inbox']
    ];
    ctx.reply('Selamat datang! Pilih opsi:', Markup.keyboard(keyboard).resize());
});

// Handling button press events
bot.hears('Buat Temp Mail', async (ctx) => {
    try {
        tempMail = await generateTempMail();
        ctx.reply(`Email sementara kamu: ${tempMail}`);
    } catch (error) {
        ctx.reply('Terjadi kesalahan saat membuat email sementara.');
    }
});

bot.hears('Ganti Temp Mail', async (ctx) => {
    try {
        tempMail = await generateTempMail();
        ctx.reply(`Email sementara kamu telah diganti: ${tempMail}`);
    } catch (error) {
        ctx.reply('Terjadi kesalahan saat mengganti email sementara.');
    }
});

bot.hears('Cek Inbox', async (ctx) => {
    if (!tempMail) {
        ctx.reply('Kamu belum membuat email sementara. Gunakan tombol "Buat Temp Mail" terlebih dahulu.');
        return;
    }

    try {
        const inbox = await checkInbox(tempMail);
        if (inbox.length === 0) {
            ctx.reply('Inbox kosong.');
        } else {
            for (const message of inbox) {
                const emailDetails = await getMessage(tempMail, message.id);
                ctx.reply(`Dari: ${emailDetails.from}\nSubjek: ${emailDetails.subject}\nIsi: ${emailDetails.body}`);
            }
        }
    } catch (error) {
        ctx.reply('Terjadi kesalahan saat memeriksa inbox.');
    }
});

// Menambahkan tombol Broadcast untuk pemilik bot
bot.hears('Broadcast', (ctx) => {
    if (ctx.from.id !== CHANGE_TO_OWNER_ID) {
        ctx.reply('Anda tidak memiliki izin untuk menggunakan perintah ini.');
        return;
    }

    ctx.reply('Kirim pesan yang akan disiarkan:', Markup.inlineKeyboard([
        Markup.button.callback('Kirim Pesan', 'SEND_BROADCAST')
    ]));
});

// Handler untuk pesan broadcast
bot.action('SEND_BROADCAST', async (ctx) => {
    if (ctx.from.id !== CHANGE_TO_OWNER_ID) {
        ctx.reply('Anda tidak memiliki izin untuk menggunakan perintah ini.');
        return;
    }

    ctx.reply('Silakan kirim pesan yang akan disiarkan.');
    bot.on('text', async (ctx) => {
        if (ctx.from.id !== CHANGE_TO_OWNER_ID) return;

        const message = ctx.message.text;
        userIds.forEach(userId => {
            bot.telegram.sendMessage(userId, message).catch(err => console.error(`Failed to send message to ${userId}:`, err));
        });

        ctx.reply('Pesan berhasil disiarkan ke semua pengguna.');
    });
});

bot.launch();

// Start the express server
app.listen(3000, () => {
    console.log('Server berjalan di port 3000');
});
