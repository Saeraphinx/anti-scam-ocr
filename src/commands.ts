import { ApplicationCommandType, ApplicationIntegrationType, Client, ContextMenuCommandBuilder, InteractionContextType, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Config } from "./config.ts";
import { MessageAnalyzer } from "./analyzeMessage.ts";

export class Commands {
    public static async handleCommand(client: Client, messageAnalyzer: MessageAnalyzer) {
        client.on("interactionCreate", async (interaction) => {
            if (!(interaction.isChatInputCommand() || interaction.isContextMenuCommand())) return;

            const { commandName } = interaction;
            if (interaction.isChatInputCommand()) {
                if (commandName === "reloadconfig") {
                    Config.readEnvConfig();
                    Config.readBannedWords();
                    await interaction.reply({ content: "Configuration reloaded!", ephemeral: true });
                } else if (commandName === "addbannedword") {
                    const word = interaction.options.getString("word", true);
                    Config.addBannedWord(word);
                    await interaction.reply({ content: `Added "${word}" to banned words list!`, ephemeral: true });
                } else if (commandName === "removebannedword") {
                    const word = interaction.options.getString("word", true);
                    Config.removeBannedWord(word);
                    await interaction.reply({ content: `Removed "${word}" from banned words list!`, ephemeral: true });
                } else if (commandName === "listbannedwords") {
                    const bannedWords = Config.readBannedWords();
                    await interaction.reply({ content: `Banned words:\n${bannedWords.join("\n")}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: "Unknown command!", ephemeral: true });
                }
            } else if (interaction.isContextMenuCommand()) {
                if (commandName === "Check OCR Text") {
                    interaction.deferReply({ ephemeral: true });
                    interaction.channel?.messages.fetch(interaction.targetId).then(message => {
                        messageAnalyzer.analyzeMessage(message).then(result => {
                            if (result.foundWords) {
                                interaction.editReply({ content: `Found banned words in the message! Detected words: ${[...new Set(result.bannedWords.map(bw => bw.word))].join(", ")}` });
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
                    await interaction.reply({ content: "Unknown command!", ephemeral: true });
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
        ]);
    }
}