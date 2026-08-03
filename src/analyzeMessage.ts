import { Client, Colors, EmbedBuilder, Message, type Snowflake } from "discord.js";
import Tesseract, { createWorker } from "tesseract.js";
import { Config } from "./config.ts";
import ms from "ms";
import os from "os";

export class MessageAnalyzer {
    // "The requested module 'tesseract.js' does not provide an export named 'Worker'"
    private ocrWorkers: Awaited<ReturnType<typeof createWorker>>[] = [];
    private static URL_REGEX = /(https?:\/\/[^\s]+)/g;
    private triggeredIds: Snowflake[] = [];
    private workerCount = 4;

    public async destroyWorker() {
        if (!this.ocrWorkers || this.ocrWorkers.length === 0) {
            return;
        }
        for (let worker of this.ocrWorkers) {
            await worker.terminate();
        }
        this.ocrWorkers = [];
    }

    public async initializeWorker() {
        this.ocrWorkers = [];
        if (this.workerCount > os.availableParallelism()) {
            console.warn(`Worker count (${this.workerCount}) is greater than available parallelism (${os.availableParallelism()}). Reducing worker count to ${os.availableParallelism()}.`);
            this.workerCount = os.availableParallelism();
        }   
        for (let i = 0; i < this.workerCount; i++) {
            this.ocrWorkers.push(await createWorker([`eng`, "rus"]));
        }       
    }

    public async analyzeMessage(message: Message): Promise<{ foundWords: false } | { foundWords: true, bannedWords: { url: string, word: string }[] }> {
        if (!this.ocrWorkers || this.ocrWorkers.length === 0) {
            throw new Error("OCR worker not initialized");
        }
        let attachmentUrls: string[] = [];
        let allBannedWords = Config.readBannedWords();

        let urlMatches = message.content.matchAll(MessageAnalyzer.URL_REGEX);
        let checkUrlPromises: Promise<void>[] = [];
        for (let url of urlMatches) {
            if (url[0]) {
                try {
                    let parsedUrl = new URL(url[0]);
                    checkUrlPromises.push(fetch(parsedUrl.href)
                        .then(fetchResult => {
                            if (fetchResult.ok && fetchResult.headers.get("content-type")?.startsWith("image/")) {
                                console.log(`Found Image URL in message content: ${parsedUrl.href}`);
                                attachmentUrls.push(parsedUrl.href);
                            }
                        })
                        .catch(console.error)
                    );
                } catch (error) {
                    console.error(`Failed to parse URL ${url[0]}`);
                    continue;
                }
            }
        }

        if (message.attachments.size > 0) {
            message.attachments.forEach(attachment => {
                if (attachment.contentType?.startsWith('image/')) {
                    console.log(`Found Attachment URL: ${attachment.url}`);
                    attachmentUrls.push(attachment.url);
                }
            });
        } else {
            console.log(`No attachments found in message ${message.id}`);
        }
        
        if (attachmentUrls.length === 0) {
            return { foundWords: false };
        }

        let bannedWords = [];
        let results = await Promise.all(
            attachmentUrls.map(async (attachment, i) => {
                return { url: attachment, ocr: await this.ocrWorkers[i % this.workerCount].recognize(attachment) };
            })
        );
        for (let ret of results) {
            for (let word of allBannedWords) {
                if (ret.ocr.data.text.toLowerCase().includes(word)) {
                    //console.log(`Banned word detected: ${word}`);
                    bannedWords.push({ url: ret.url, word });
                }
            }
        }

        if (bannedWords.length > 0) {
            console.log(`Banned words found in message ${message.id}: ${bannedWords.join(", ")}`);
            return { foundWords: true, bannedWords };
        } else {
            console.log(`No banned words found in message ${message.id}`);
            return { foundWords: false };    
        }
    }

    public async registerEventListener(client: Client) {
        client.on("messageCreate", async (message) => {
            Config.DEBUG ? console.log(`Received message ${message.id} from ${message.author.tag} (${message.author.id}) in channel ${message.channel.id}`) : null;
            if (message.author.id === client.user?.id) {
                return;
            }

            if (Config.IS_WHITELIST) {
                if (!Config.ALLOWED_CHANNELS.includes(message.channel.id)) {
                    Config.DEBUG ? console.log(`Skipping message ${message.id} because channel ${message.channel.id} is not in the whitelist`) : null;
                    return;
                }
            } else {
                if (Config.DISALLOWED_CHANNELS.includes(message.channel.id)) {
                    Config.DEBUG ? console.log(`Skipping message ${message.id} because channel ${message.channel.id} is in the blacklist`) : null;
                    return;
                }
            }

            if (!Config.SCAN_EVERYTHING) {
                if (message.author.bot) {
                    Config.DEBUG ? console.log(`Skipping message ${message.id} because author is a bot and SCAN_EVERYTHING is false`) : null;
                    return;
                }

                if (message.member && !message.member.moderatable) {
                    console.log(`Skipping message ${message.id} from ${message.author.tag} (${message.author.id}) because member is not moderatable (or findable)`);
                    return;
                }
            }
            console.time(`Analyzing message ${message.id}`);
            let result = await this.analyzeMessage(message);
            let deleted = "No (Config)";
            let punished = "No (Config)";

            if (result.foundWords) {
                console.log(`Detected banned words in message ${message.id}: ${result.bannedWords.map(w=> w.word).join(", ")}`);
                this.triggeredIds.push(message.author.id);
                let triggerCount = this.triggeredIds.filter(id => id === message.author.id).length;

                if (Config.SHOULD_DELETE) {
                    if (message.deletable) {
                        await message.delete().catch((err) => {
                            console.error(err);
                            deleted = "No (Error)";
                        }).then(() => {
                            deleted = "Yes";
                        });
                    } else {
                        console.warn(`Cannot delete message ${message.id}`);
                        deleted = "No (Cannot Delete)";
                    }
                }

                if (Config.SHOULD_KICK || Config.SHOULD_TIMEOUT) {
                    if (Config.SHOULD_KICK) {
                        if (!(message.member && message.member.kickable)) {
                            punished = `No (Cannot Kick)`;
                        } else {
                            if (triggerCount >= Config.TRIGGERS_BEFORE_ACTION) {
                                await message.member.kick(`Triggered OCR Scam Detector ${triggerCount} times`).catch((err) => {
                                    console.error(err);
                                    punished = "No (Error)";
                                }).then(() => {
                                    punished = "Yes (Kick)";
                                });
                            } else {
                                punished = `No (${triggerCount}/${Config.TRIGGERS_BEFORE_ACTION})`;
                            }
                        }
                    } else if (Config.SHOULD_TIMEOUT) {
                        if (!(message.member && message.member.moderatable)) {
                            punished = `No (Cannot timeout)`;
                        } else {
                            if (triggerCount >= Config.TRIGGERS_BEFORE_ACTION) {
                                await message.member.timeout(Config.TIMEOUT_DURATION, `Triggered OCR Scam Detector ${triggerCount} times`).catch((err) => {
                                    console.error(err);
                                    punished = "No (Error)";
                                }).then(() => {
                                    punished = `Yes (for ${ms(Config.TIMEOUT_DURATION, { long: true })})`;
                                });
                            } else {
                                punished = `No (${triggerCount}/${Config.TRIGGERS_BEFORE_ACTION})`;
                            }
                        }
                    }
                    /*if (message.member && message.member.moderatable) {
                        if (triggerCount >= TRIGGERS_BEFORE_ACTION) {
                            await message.member.timeout(TIMEOUT_DURATION).catch((err) => {
                                console.error(err);
                                punished = "No (Error)";
                            }).then(() => {
                                punished = `Yes (for ${ms(TIMEOUT_DURATION, { long: true })})`;
                            });
                        } else {
                            punished = `No (Only ${triggerCount}/${TRIGGERS_BEFORE_ACTION} Triggers)`;
                        }
                    } else {
                        console.warn(`Cannot punish member ${message.member?.id} in message ${message.id}`);
                        punished = "No (Cannot Moderate)";
                    }*/
                }

                console.timeEnd(`Analyzing message ${message.id}`);
                if (Config.LOG_CHANNEL && Config.LOG_CHANNEL !== "") {
                    const logChannel = await client.channels.fetch(Config.LOG_CHANNEL);
                    if (logChannel && logChannel?.isSendable()) {
                        let words = [...new Set(result.bannedWords.map(bw => bw.word))];
                        let urls = [...new Set(result.bannedWords.map(bw => bw.url))];
                        let embed = new EmbedBuilder()
                            .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL() })
                            .setTitle("Detected OCR Scam Message")
                            .setDescription(`Triggered OCR with words:\n${words.map(w => `\`${w}\``).join(", ")}\n\n**URLs:**\n${urls.join("\n")}`)
                            .addFields({ name: "User", value: `${message.author.toString()}`, inline: true })
                            .addFields({ name: "Channel", value: `${message.channel.toString()}`, inline: true })
                            .addFields({ name: "Message ID", value: `${message.id}`, inline: true })
                            .addFields({ name: "Deleted", value: `${deleted} `, inline: true })
                            .addFields({ name: "Punished", value: `${punished} `, inline: true })
                            .addFields({ name: "Times Triggered", value: `${triggerCount} `, inline: true })
                            .setColor(Colors.Red)
                            .setTimestamp()
                            .setFooter({ text: "Took " + ms(Date.now() - message.createdTimestamp, { long: true }) + " to analyze" });
                        logChannel.send({ embeds: [embed] }).catch(console.error);
                    }
                }
            }
        });
    }
}
