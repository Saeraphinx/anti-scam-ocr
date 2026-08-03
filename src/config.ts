import ms, { type StringValue } from "ms";
import fs from "fs";

const bannedWordsFilePath = "./config/bannedWords.txt";

export class Config {
    public static DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
    public static ALLOWED_CHANNELS = process.env.ALLOWED_CHANNELS?.split(",") || [];
    public static DISALLOWED_CHANNELS = process.env.DISALLOWED_CHANNELS?.split(",") || [];
    public static IS_WHITELIST = process.env.IS_WHITELIST === "true";
    /*public static BANNED_WORDS = process.env.BANNED_WORDS?.split(",") || [
        "crypto casino", "special promo code", "withdrawl successful", "free gift",
        "cryptocurrency casino", "claim your reward"
    ];*/
    public static LOG_CHANNEL = process.env.LOG_CHANNEL || "";
    public static SHOULD_DELETE = process.env.SHOULD_DELETE ? process.env.SHOULD_DELETE === `true` : "true";
    public static SHOULD_TIMEOUT = process.env.SHOULD_TIMEOUT ? process.env.SHOULD_TIMEOUT === `true` : true;
    public static SHOULD_KICK = process.env.SHOULD_KICK ? process.env.SHOULD_KICK === `true` : false;
    public static TIMEOUT_DURATION = process.env.TIMEOUT_DURATION ? ms(process.env.TIMEOUT_DURATION as StringValue) : ms("7d");
    public static SCAN_EVERYTHING = process.env.SCAN_EVERYTHING ? process.env.SCAN_EVERYTHING === "true" : true;
    public static TRIGGERS_BEFORE_ACTION = process.env.TRIGGERS_BEFORE_ACTION ? parseInt(process.env.TRIGGERS_BEFORE_ACTION) : 1;
    public static DEBUG = process.env.DEBUG ? process.env.DEBUG === "true" : false;

    private static bannedWords = [
        "crypto casino", "special promo code", "withdrawl successful", "free gift", "cryptocurrency casino", "claim your reward", "enter the promo code", "transferred to your specified wallet", "money will be transferred", "withdrawal success", "withdrawal method", "your rakeback", "available rakeback"
    ];

    private static lastConfigRead: Date = new Date(0);

    public static readEnvConfig() {
        this.DISCORD_TOKEN = process.env.DISCORD_TOKEN || this.DISCORD_TOKEN;
        this.ALLOWED_CHANNELS = process.env.ALLOWED_CHANNELS ? process.env.ALLOWED_CHANNELS.split(",") : this.ALLOWED_CHANNELS;
        this.DISALLOWED_CHANNELS = process.env.DISALLOWED_CHANNELS ? process.env.DISALLOWED_CHANNELS.split(",") : this.DISALLOWED_CHANNELS;
        this.IS_WHITELIST = process.env.IS_WHITELIST ? process.env.IS_WHITELIST === "true" : this.IS_WHITELIST;
        //this.BANNED_WORDS = process.env.BANNED_WORDS ? process.env.BANNED_WORDS.split(",") : this.BANNED_WORDS;
        this.LOG_CHANNEL = process.env.LOG_CHANNEL || this.LOG_CHANNEL;
        this.SHOULD_DELETE = process.env.SHOULD_DELETE ? process.env.SHOULD_DELETE === `true` : this.SHOULD_DELETE;
        this.SHOULD_TIMEOUT = process.env.SHOULD_TIMEOUT ? process.env.SHOULD_TIMEOUT === `true` : this.SHOULD_TIMEOUT;
        this.SHOULD_KICK = process.env.SHOULD_KICK ? process.env.SHOULD_KICK === `true` : this.SHOULD_KICK;
        this.TIMEOUT_DURATION = process.env.TIMEOUT_DURATION ? ms(process.env.TIMEOUT_DURATION as StringValue) : this.TIMEOUT_DURATION;
        this.SCAN_EVERYTHING = process.env.SCAN_EVERYTHING ? process.env.SCAN_EVERYTHING === "true" : this.SCAN_EVERYTHING;
        this.TRIGGERS_BEFORE_ACTION = process.env.TRIGGERS_BEFORE_ACTION ? parseInt(process.env.TRIGGERS_BEFORE_ACTION) : this.TRIGGERS_BEFORE_ACTION;
        this.DEBUG = process.env.DEBUG ? process.env.DEBUG === "true" : this.DEBUG;
        console.log("Configuration reloaded from environment variables.");
        console.log(`Current configuration: ${JSON.stringify({
            ALLOWED_CHANNELS: this.ALLOWED_CHANNELS,
            DISALLOWED_CHANNELS: this.DISALLOWED_CHANNELS,
            IS_WHITELIST: this.IS_WHITELIST,
            //this.BANNED_WORDS,
            LOG_CHANNEL: this.LOG_CHANNEL,
            SHOULD_DELETE: this.SHOULD_DELETE,
            SHOULD_TIMEOUT: this.SHOULD_TIMEOUT,
            SHOULD_KICK: this.SHOULD_KICK,
            TIMEOUT_DURATION: this.TIMEOUT_DURATION,
            SCAN_EVERYTHING: this.SCAN_EVERYTHING,
            TRIGGERS_BEFORE_ACTION: this.TRIGGERS_BEFORE_ACTION
        }, null, 2)}`);

        if (process.env.BANNED_WORDS && process.env.BANNED_WORDS.trim().length > 0) {
            this.bannedWords = process.env.BANNED_WORDS.split(",").map(word => word.trim()).filter(word => word.length > 0);
            console.warn(`Banned words overridden by environment variable: ${this.bannedWords.join(", ")}`);
        }
    }

    public static readBannedWords() {
        if (this.lastConfigRead.getTime() < new Date().getTime() - ms("1m")) {
            // Check if bannedWords.txt exists, if not create it with default banned words
            if (!fs.existsSync(bannedWordsFilePath)) {
                let pathMinusFile = bannedWordsFilePath.substring(0, bannedWordsFilePath.lastIndexOf("/"));
                if (!fs.existsSync(pathMinusFile)) {
                    fs.mkdirSync(pathMinusFile, { recursive: true });
                }
                fs.writeFileSync(bannedWordsFilePath, this.bannedWords.join("\n"));
                console.warn("bannedWords.txt not found, created default file with default banned words.");
            }

            try {
                this.bannedWords = fs.readFileSync(bannedWordsFilePath, "utf-8").split("\n").map(word => word.trim()).filter(word => word.length > 0 || !word.startsWith("#") || !word.startsWith("//"));
                // overwrite the file if it is empty and there are banned words in the environment variable
                if (this.bannedWords.length === 0 && process.env.BANNED_WORDS && process.env.BANNED_WORDS.trim().length > 0) {
                    console.warn("bannedWords.txt is empty, overwriting with saved banned words.");
                    fs.writeFileSync(bannedWordsFilePath, this.bannedWords.join("\n"));
                }
                this.lastConfigRead = new Date();
            } catch (error) {
                console.error(`Error reading bannedWords.txt: ${error}`);
            }
        }
        return this.bannedWords;
    }

    public static addBannedWord(word: string) {
        fs.appendFileSync(bannedWordsFilePath, `\n${word}`);
        this.bannedWords.push(word);
    }

    public static removeBannedWord(word: string) {
        const index = this.bannedWords.indexOf(word);
        if (index !== -1) {
            this.bannedWords.splice(index, 1);
            fs.writeFileSync(bannedWordsFilePath, this.bannedWords.join("\n"));
        }
    }
}
    