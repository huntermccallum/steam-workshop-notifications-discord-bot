import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import schedule from 'node-schedule'
import * as util from './modules/util.js'
import * as cache from './modules/cache-manager.js'
import { modManager } from './modules/mod-manager.js'
import { spotRepManager } from './modules/spotrep-manager.js'
import { logger } from './modules/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, './config/config.json');
const configRaw = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(configRaw);

const id = function (message) {
    logger.debug(`Received 'id' command from user '${message.author.username}'.`)

    message.reply(message.author.id).catch((e) => logger.error(e))
}

const version = function (message) {
    logger.debug(`Received 'version' command from user '${message.author.username}'.`)

    message.reply(`Steam Workshop Notifications Discord Bot Version ${process.env.npm_package_version} by Brian`).catch((e) => logger.error(e))
}

const info = function (message) {
    logger.debug(`Received 'info' command from user '${message.author.username}'.`)

    modManager.emit('listMods', message.guildId, (mods) => {
        modManager.emit('listNotificationsForGuildId', message.guildId, async (notifications) => {
            try {
                let infoString = `Monitoring ${mods.length} mod(s).`
                if (notifications) {
                    infoString += ` Notifying ${notifications.memberIds.length} members and ${notifications.roleIds.length} roles on ${notifications.channelIds.length} channels. \r\n`
                    let channels = await Promise.all(notifications.channelIds.map((id) => message.guild.channels.fetch(id))).then((channels) => channels.map((channel) => `> ${channel.toString()}`))
                    let members = await Promise.all(notifications.memberIds.map((id) => message.guild.members.fetch(id))).then((members) => members.map((member) => `> ${member.toString()}`))
                    let roles = await Promise.all(notifications.roleIds.map((id) => message.guild.roles.fetch(id))).then((roles) => roles.map((role) => `> ${role.toString()}`))

                    if (channels.length > 0) infoString += `\r\n Channels: \r\n ${channels.join('\r\n')} \r\n`
                    if (members.length > 0) infoString += `\r\n Members: \r\n ${members.join('\r\n')} \r\n`
                    if (roles.length > 0) infoString += `\r\n Roles: \r\n ${roles.join('\r\n')}`
                } else infoString += ' Notifications disabled.'

                if (mods.length > 0) infoString += `\r\n Mods: \r\n ${mods.map((x) => `> ${x.name}\r\n`).join('')}`

                const splitInfoStrings = util.splitString(infoString, 1900)
                for (let splitInfoString of splitInfoStrings) {
                    message.reply(`${splitInfoString}`).catch((e) => logger.error(e))
                }
            } catch (e) {
                logger.error(e)
                return message.reply(`Error: ${e.message}`)
            }
        })
    })
}

const monitor = function (message) {
    logger.debug(`Received 'monitor' command from user '${message.author.username}'.`)

    // If there is no attachment, ignore this message.
    if (message.attachments.size === 0) {
        message.reply('Error: No attachment found.').catch((e) => logger.error(e))
        return
    }

    // Check if all attachments are of content type html.
    let invalid_attachment = false
    message.attachments.forEach((attachment) => {
        if (!attachment.contentType.toLowerCase().includes('html')) {
            invalid_attachment = true
        }
    })

    // If there is an invalid attachment, ignore this message.
    if (invalid_attachment === true) {
        message.reply('Error: HTML attachment expected.').catch((e) => logger.error(e))
        return
    }

    logger.debug('Parsing attachments.')

    message.attachments.forEach((attachment) => {
        util.downloadFile(attachment.attachment)
            .then((html) => util.parseModsHtml(html))
            .then((mods) => {
                for (let mod in mods) {
                    mods[mod]['guilds'] = [message.guildId]
                }
                modManager.emit('monitorMods', mods, message.guildId)
                return message.reply(`Parsed ${Object.keys(mods).length} mods.`)
            })
            .catch((e) => {
                logger.error(e)
                return message.reply(`Error: ${e.message}`)
            })
            .catch((e) => logger.error(e))
    })
}

const notify = function (message) {
    logger.debug(`Received 'notify' command from user '${message.author.username}'.`)

    let channelIds = []
    for (let channelNotification of message.mentions.channels) {
        let channelId = channelNotification[0]
        channelIds.push(channelId)
    }

    let memberIds = []
    for (let memberNotification of message.mentions.members) {
        let memberId = memberNotification[0]
        if (client.user.id === memberId) continue

        memberIds.push(memberId)
    }

    let roleIds = []
    for (let roleNotification of message.mentions.roles) {
        let roleId = roleNotification[0]
        roleIds.push(roleId)
    }

    let notifications = {
        channelIds: channelIds,
        memberIds: memberIds,
        roleIds: roleIds,
    }

    modManager.emit('setNotifications', message.guildId, notifications, () => {
        message.reply(`Notifications set, ${memberIds.length} members and ${roleIds.length} roles will be notified on ${channelIds.length} channels.`)
    })
}

const logs = function (message) {
    logger.debug(`Received 'logs' command from user '${message.author.username}'.`)

    util.readFile('logs/combined.log')
        .then((data) => data.slice(-1900))
        .then((res) => message.reply(`\`Combined.log\`\r\n\`\`\`${res}\`\`\``))
    util.readFile('logs/error.log')
        .then((data) => data.slice(-1900))
        .then((res) => message.reply(`\`error.log\`\r\n\`\`\`${res}\`\`\``))
}

const disable = function (message) {
    logger.debug(`Received 'disable' command from user '${message.author.username}'.`)

    modManager.emit('deleteAll', message.guildId, () => {
        message.reply('Monitoring disabled.')
    })
}

const validCommands = 'Valid commands: id (DM allowed), info, logs (DM allowed), monitor, notify, disable, version (DM allowed).'

// Create a new client instance
const client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    partials: [Partials.Channel],
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    logger.info('Steam Workshop Notifications Discord Bot Online! Active on:')
    client.guilds
        .fetch()
        .then((guilds) => guilds.forEach((guild) => logger.info(`* ${guild.name} - ${guild.id}`)))
        .catch((e) => logger.error(e))

    // TODO cross check mod caches with the joined servers, detect if bot is removed from a server, and then empty the cache for that server
    // TODO also, add an 'on leave' event
})

// When a message is received
client.on('messageCreate', async (message) => {
    // If message is from the bot itself, ignore this message.
    if (message.author.bot) return

    // If the bot isn't mentioned, ignore this message.
    if (!message.mentions.has(client.user.id)) return

    // If the bot isn't mentioned first, ignore this message.
    if (message.mentions.users.first().id !== client.user.id) return

    logger.debug(`User '${message.author.username}' sent message: '${message}'`)

    let commands = message.content.split(' ')
    if (commands.length <= 1) {
        logger.warn(`No command found in message: ${message} from user '${message.author.username}'`)
        message.reply(`Error: No command found. ${validCommands}`).catch((e) => logger.error(e))
        return
    }

    switch (commands[1]) {
        case 'id':
            id(message)
            return
    }

    // If the author of the message is not an admin, ignore this message.
    if (!config.admins.includes(message.author.id)) {
        logger.warn(`User '${message.author.username}' does not have admin permissions.`)
        message.reply('Error: No admin permissions.').catch((e) => logger.error(e))
        return
    }

    // DM supported commands
    switch (commands[1]) {
        case 'version':
            version(message)
            return
        case 'logs':
            logs(message)
            return
        default:
            if (message.channel.type !== 'DM') break
            logger.warn(`Unknown command '${commands[1]}' from user '${message.author.username}'`)
            message.reply(`Error: Unknown command: \`${commands[1]}\`. ${validCommands}`).catch((e) => logger.error(e))
            return
    }

    // Non-DM commands
    switch (commands[1]) {
        case 'info':
            info(message)
            return
        case 'monitor':
            monitor(message)
            return
        case 'notify':
            notify(message)
            return
        case 'disable':
            disable(message)
            return
        default:
            logger.warn(`Unknown command '${commands[1]}' from user '${message.author.username}'`)
            message.reply(`Error: Unknown command: \`${commands[1]}\`. ${validCommands}`).catch((e) => logger.error(e))
            return
    }
})

await cache.createSpotRepCache()
const cachedSpotRep = await cache.readSpotRepFromCache()
spotRepManager.emit('loadSpotRepFromCache', cachedSpotRep)

await cache.createNotificationsCache()
const cachedNotifications = await cache.readNotificationsFromCache()
modManager.emit('loadNotificationsFromCache', cachedNotifications)

await cache.createModsCache()
const cachedMods = await cache.readModsFromCache()
modManager.emit('loadModsFromCache', cachedMods)

await client.login(config.token)

// Check ArmA SpotRep every minute
schedule.scheduleJob('0 * * * * *', function () {
    spotRepManager.emit('checkSpotRep', client)
})

// Check Steam Workshop items every 10 seconds
schedule.scheduleJob('*/3 * * * * *', function () {
    modManager.emit('checkMod', client)
})
