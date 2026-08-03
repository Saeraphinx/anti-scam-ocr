import { ApplicationCommandType, ApplicationIntegrationType, Client, Colors, ContextMenuCommandBuilder, EmbedBuilder, InteractionContextType, MessageFlagsBitField, PermissionsBitField, SlashCommandBuilder, User } from "discord.js";
import { Config } from "./config.ts";
import { MessageAnalyzer } from "./analyzeMessage.ts";

export class Commands {
    public static async handleCommand(client: Client, messageAnalyzer: MessageAnalyzer) {
        client.on("interactionCreate", async (interaction) => {
            if (!(interaction.isChatInputCommand() || interaction.isContextMenuCommand())) return;

            const { commandName } = interaction;
            console.log(`received command: ${commandName} from user ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild?.name} (${interaction.guildId})`);
            if (interaction.isChatInputCommand()) {
                if (commandName === "reloadconfig") {
                    Config.readEnvConfig();
                    Config.readBannedWords();
                    await interaction.reply({ content: "Configuration reloaded!", flags: MessageFlagsBitField.Flags.Ephemeral });
                } else if (commandName === "addbannedword") {
                    const word = interaction.options.getString("word", true);
                    Config.addBannedWord(word);
                    await interaction.reply({ content: `Added "${word}" to banned words list!`, flags: MessageFlagsBitField.Flags.Ephemeral });
                } else if (commandName === "removebannedword") {
                    const word = interaction.options.getString("word", true);
                    Config.removeBannedWord(word);
                    await interaction.reply({ content: `Removed "${word}" from banned words list!`, flags: MessageFlagsBitField.Flags.Ephemeral });
                } else if (commandName === "listbannedwords") {
                    const bannedWords = Config.readBannedWords();
                    await interaction.reply({ content: `Banned words:\n${bannedWords.join("\n")}`, flags: MessageFlagsBitField.Flags.Ephemeral });
                } else {
                    await interaction.reply({ content: "Unknown command!", flags: MessageFlagsBitField.Flags.Ephemeral });
                }
            } else if (interaction.isContextMenuCommand()) {
                if (commandName === "Check OCR Text") {
                    await interaction.deferReply({ flags: MessageFlagsBitField.Flags.Ephemeral });
                    interaction.channel?.messages.fetch(interaction.targetId).then(message => {
                        messageAnalyzer.analyzeMessage(message).then(result => {
                            if (result.foundWords) {
                                interaction.editReply({ content: `Found banned words in the message!\n\`\`\`json\n${JSON.stringify(result.bannedWords, null, 2)}\`\`\`` });
                            } else {
                                interaction.editReply({ content: "No banned words found in the message." });
                            }
                        }).catch(err => {
                            console.error(`Error analyzing message ${message.id}: ${err}`);
                            interaction.editReply({ content: "An error occurred while analyzing the message." });
                        });
                    }).catch(err => {
                        console.error(`Error fetching message with ID ${interaction.targetId}: ${err}`);
                        interaction.editReply({ content: "An error occurred while fetching the message." });
                    });
                } else {
                    await interaction.reply({ content: "Unknown command!", flags: MessageFlagsBitField.Flags.Ephemeral });
                }
            }
        });
    }

    public static async registerCommands(client: Client) {
        let reloadConfigCommand = new SlashCommandBuilder()
            .setName("reloadconfig")
            .setDescription("Reload the bot's configuration from environment variables and bannedWords.txt")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        let addBannedWordCommand = new SlashCommandBuilder()
            .setName("addbannedword")
            .setDescription("Add a word to the banned words list")
            .addStringOption(option => option.setName("word").setDescription("The word to add").setRequired(true))
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)

        let removeBannedWordCommand = new SlashCommandBuilder()
            .setName("removebannedword")
            .setDescription("Remove a word from the banned words list")
            .addStringOption(option => option.setName("word").setDescription("The word to remove").setRequired(true))
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)

        let listBannedWordsCommand = new SlashCommandBuilder()
            .setName("listbannedwords")
            .setDescription("List all banned words")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)

        let checkMessageCommand = new ContextMenuCommandBuilder()
            .setName("Check OCR Text")
            .setType(ApplicationCommandType.Message)
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers) // require manage guild permission to use this command


        await client.application?.commands.set([
            reloadConfigCommand,
            addBannedWordCommand,
            removeBannedWordCommand,
            listBannedWordsCommand,
            checkMessageCommand
        ]).then(() => {
            console.log("Commands registered successfully!");
        }).catch(err => {
            console.error(`Error registering commands: ${err}`);
        });
    }

    public static async sendWordUpdateLog(client: Client, user: User, action: "added" | "removed", word: string) {
        if (!Config.LOG_CHANNEL) {
            console.warn("LOG_CHANNEL is not set, cannot send log message.");
            return;
        }

        const logChannel = await client.channels.fetch(Config.LOG_CHANNEL).catch(err => {
            console.error(`Error fetching log channel with ID ${Config.LOG_CHANNEL}: ${err}`);
            return null;
        });

        if (!logChannel || !logChannel.isSendable()) {
            console.error(`Log channel with ID ${Config.LOG_CHANNEL} is not a text channel.`);
            return;
        }

        let embed = new EmbedBuilder()
            .setAuthor({ name: `${user.displayName}`, iconURL: user.displayAvatarURL() })
            .setTitle("Banned Words List Updated")
            .setDescription(`**Action:** ${action === "added" ? "Added" : "Removed"}\n**Word:** ${word}`)
            .setColor(action === "added" ? Colors.Green : Colors.Red)
            .setTimestamp()
        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
}