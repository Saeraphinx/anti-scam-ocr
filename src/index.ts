import { ActivityType, Client, Colors, EmbedBuilder, IntentsBitField } from "discord.js";
import { MessageAnalyzer } from "./analyzeMessage.ts";
import 'dotenv/config'
import ms, { StringValue } from "ms";

async function init() {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
    const ALLOWED_CHANNELS = process.env.ALLOWED_CHANNELS?.split(",") || [];
    const DISALLOWED_CHANNELS = process.env.DISALLOWED_CHANNELS?.split(",") || [];
    const IS_WHITELIST = process.env.IS_WHITELIST === "true";
    const BANNED_WORDS = process.env.BANNED_WORDS?.split(",") || ["crypto casino", "special promo code", "withdrawl successful", "free gift"];
    const LOG_CHANNEL = process.env.LOG_CHANNEL || "";
    const SHOULD_DELETE = process.env.SHOULD_DELETE === "true";
    const SHOULD_PUNISH = process.env.SHOULD_PUNISH === "true";
    const TIMEOUT_DURATION = process.env.TIMEOUT_DURATION ? ms(process.env.TIMEOUT_DURATION as StringValue) : ms("7d");

    const bot = new Client({
        intents: [IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
        presence: {
            activities: [{ name: "hi :3", type: ActivityType.Custom }],
            status: "online"
        }
    });
    const messageAnalyzer = new MessageAnalyzer(BANNED_WORDS);

    await messageAnalyzer.initializeWorker();

    bot.on("clientReady", () => {
        console.log(`Logged in as ${bot.user?.tag}!`);
    });

    bot.on("messageCreate", async (message) => {
        if (IS_WHITELIST) {
            if (!ALLOWED_CHANNELS.includes(message.channel.id)) {
                return;
            }
        } else {
            if (DISALLOWED_CHANNELS.includes(message.channel.id)) {
                return;
            }
        }

        let result = await messageAnalyzer.analyzeMessage(message);

        if (result.foundWords) {
            console.log(`Detected banned words in message ${message.id}: ${result.bannedWords.join(", ")}`);
            if (SHOULD_DELETE && message.deletable) {
                await message.delete().catch(console.error);
            } else {
                console.warn(`Cannot delete message ${message.id}`);
            }

            if (SHOULD_PUNISH) {
                if (message.member && message.member.moderatable) {
                    message.member.timeout(TIMEOUT_DURATION).catch(console.error);
                } else {
                    console.warn(`Cannot punish member ${message.member?.id} in message ${message.id}`);
                }
            }

            
            if (LOG_CHANNEL || LOG_CHANNEL !== "") {
                const logChannel = await bot.channels.fetch(LOG_CHANNEL);
                if (logChannel && logChannel?.isSendable()) {
                    let words = [...new Set(result.bannedWords.map(bw => bw.word))];
                    let urls = [...new Set(result.bannedWords.map(bw => bw.url))];
                    let embed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL() })
                        .setTitle("Detected OCR Scam Message")
                        .setDescription(`Triggered OCR with words:\n${words.join(", ")}\n\n**URLs:**\n${urls.join("\n")}`)
                        .addFields({ name: "User", value: `${message.author.toString()}`, inline: true })
                        .addFields({ name: "Channel", value: `${message.channel.toString()}`, inline: true })
                        .addFields({ name: "Message ID", value: `${message.id}`, inline: true })
                        .setColor(Colors.Red)
                        .setTimestamp();
                    logChannel.send({ embeds: [embed] }).catch(console.error);
                }
            }
        }
    });

    bot.login(DISCORD_TOKEN);

    return {
        bot,
        stop: async () => {
            messageAnalyzer.destroyWorker();
            bot.destroy();
            process.exit(0);
        }
    }
}

if (process.argv[1] === import.meta.filename) {
    const { stop } = await init().catch((err) => {
        console.error(`Failed to initialize BadModelSaber: ${err}`);
        process.exit(1);
    });

    process.on('SIGINT', async () => {
        await stop();
    });
}