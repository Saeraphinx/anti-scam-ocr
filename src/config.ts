import ms, { StringValue } from "ms";
import fs from "fs";

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
    public static SHOULD_TIMEOUT = process.env.SHOULD_TIMEOUT ? process.env.SHOULD_TIMEOUT === `true` : "true";
    public static SHOULD_KICK = process.env.SHOULD_KICK ? process.env.SHOULD_KICK === `true` : "false";
    public static TIMEOUT_DURATION = process.env.TIMEOUT_DURATION ? ms(process.env.TIMEOUT_DURATION as StringValue) : ms("7d");
    public static SCAN_EVERYTHING = process.env.SCAN_EVERYTHING ? process.env.SCAN_EVERYTHING === "true" : true;
    public static TRIGGERS_BEFORE_ACTION = process.env.TRIGGERS_BEFORE_ACTION ? parseInt(process.env.TRIGGERS_BEFORE_ACTION) : 1;

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
    }

    public static readBannedWords() {
        if (this.lastConfigRead.getTime() < new Date().getTime() - ms("1m")) {
            this.bannedWords = fs.readFileSync("config/bannedWords.txt", "utf-8").split("\n").map(word => word.trim()).filter(word => word.length > 0 || !word.includes("#") || !word.includes("//"));
            this.lastConfigRead = new Date();
        }
        return this.bannedWords;
    }

    public static addBannedWord(word: string) {
        fs.appendFileSync("config/bannedWords.txt", `\n${word}`);
        this.bannedWords.push(word);
    }

    public static removeBannedWord(word: string) {
        const index = this.bannedWords.indexOf(word);
        if (index !== -1) {
            this.bannedWords.splice(index, 1);
            fs.writeFileSync("confing/bannedWords.txt", this.bannedWords.join("\n"));
        }
    }
}
    