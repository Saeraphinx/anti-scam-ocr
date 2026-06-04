import { ActivityType, Client, Colors, EmbedBuilder, IntentsBitField, Snowflake } from "discord.js";
import { MessageAnalyzer } from "./analyzeMessage.ts";
import { Config } from "./config.ts";
import { Commands } from "./commands.ts";


async function init() {
    Config.readEnvConfig();
    const bot = new Client({
        intents: [IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
        presence: {
            activities: [{ name: new Date().getMonth() == 5 ? '🏳️‍🌈 Happy Pride Month' : `hi :3`, type: ActivityType.Custom }],
            status: "online"
        }
    });
    const messageAnalyzer = new MessageAnalyzer();

    await messageAnalyzer.initializeWorker();
    await Commands.registerCommands(bot);
    await Commands.handleCommand(bot, messageAnalyzer);

    bot.on("clientReady", () => {
        console.log(`Logged in as ${bot.user?.tag}!`);
    });

    bot.login(Config.DISCORD_TOKEN);

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
        console.error(`Failed to initialize anti-scam-ocr: ${err}`);
        process.exit(1);
    });

    process.on('SIGINT', async () => {
        await stop();
    });

}
