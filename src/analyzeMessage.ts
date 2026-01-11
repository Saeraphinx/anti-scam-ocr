import { Message } from "discord.js";
import { createWorker } from "tesseract.js";

export class MessageAnalyzer {
    // "The requested module 'tesseract.js' does not provide an export named 'Worker'"
    private ocrWorker: Awaited<ReturnType<typeof createWorker>> | null;
    public bannedWords: string[];
    private static URL_REGEX = /(https?:\/\/[^\s]+)/g;

    constructor(bannedWords?: string[]) {
        this.bannedWords = bannedWords || [];
    }

    public async destroyWorker() {
        if (!this.ocrWorker) {
            return;
        }
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
    }

    public async initializeWorker() {
        this.ocrWorker = await createWorker("eng");
    }

    public async analyzeMessage(message: Message): Promise<{ foundWords: false } | { foundWords: true, bannedWords: { url: string, word: string }[] }> {
        if (!this.ocrWorker) {
            throw new Error("OCR worker not initialized");
        }
        let attachmentUrls: string[] = [];
        
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
        await Promise.all(checkUrlPromises);

        if (attachmentUrls.length === 0) {
            return { foundWords: false };
        }

        const worker = await createWorker('eng');
        let bannedWords = [];
        let results = await Promise.all(
            attachmentUrls.map(async (attachment) => {
                return { url: attachment, ocr: await worker.recognize(attachment) };
            })
        );
        for (let ret of results) {
            for (let word of this.bannedWords) {
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
}
