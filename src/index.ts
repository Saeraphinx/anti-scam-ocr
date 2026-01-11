import { Client, IntentsBitField } from "discord.js";
import { readFileSync } from "fs";
import { createWorker } from "tesseract.js";


const token = readFileSync('token.txt', 'utf-8');
const allowedChannels = [`1315148413750214656`];
const BANNED_WORDS = ["crypto casino", "special promo code", "withdrawl successful", "free gift"];

let bot = new Client({
    intents: [IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
});

bot.on("clientReady", () => {
    console.log(`Logged in as ${bot.user?.tag}!`);
});

const worker = await createWorker("eng");
bot.on("messageCreate", async (message) => {
    //console.log(`Received message ${message.id} from ${message.author.tag}`);
    if (!allowedChannels.includes(message.channelId)) return;
    //console.log(`processing message ${message.id} from ${message.author.tag}`);
    let attachmentUrls: string[] = [];
    if (message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            if (attachment.contentType?.startsWith('image/')) {
                console.log(`Found Attachment URL: ${attachment.url}`);
                attachmentUrls.push(attachment.url);
            }
        });
    } else {
        console.log(`No attachments found in message ${message.id}`);
        return;
    }

    const worker = await createWorker('eng');
    let bannedWords = [];
    let results = await Promise.all(
        attachmentUrls.map(async (attachment) => {
            return await worker.recognize(attachment);
        })
    );
    for (let ret of results) {
        for (let word of BANNED_WORDS) {
            if (ret.data.text.toLowerCase().includes(word)) {
                //console.log(`Banned word detected: ${word}`);
                bannedWords.push(word);
            }
        }
    }

    if (bannedWords.length > 0) {
        console.log(`Banned words found in message ${message.id}: ${bannedWords.join(", ")}`);
        await message.reply(`Warning: Your message contains banned words: ${[...new Set(bannedWords)].join(", ")}`);
    } else {
        console.log(`No banned words found in message ${message.id}`);
    }
    console.log(`finished processing message from ${message.author.tag}`);
});

bot.login(token);

function shutdown() {
    console.log("Shutting down...");
    bot.destroy();
    worker.terminate();
    process.exit(0);
}

process.on('exit', () => {
    shutdown();
});

process.on('SIGINT', () => {
    shutdown();
});

process.on('SIGTERM', () => {
    shutdown();
});


