import EventEmitter from 'events'
import moment from 'moment'
import * as cache from './cache-manager.js'
import * as util from './util.js'
import { logger } from './logger.js'

const modManager = new EventEmitter()
let modDatabase = new Map()
let notificationDatabase = new Map()

let modQueue = []

const deleteAll = function (guildId) {
    // Delete old guildId -> notifications link
    notificationDatabase.delete(guildId)

    deleteGuild(guildId)
}

const deleteGuild = function (guildId) {
    // Delete old guildId references from mod database
    for (const [modUrl, mod] of modDatabase.entries()) {
        if (mod.guilds.has(guildId)) mod.guilds.delete(guildId)

        // If a mod has no guildId references, delete the mod
        if (mod.guilds.size === 0) modDatabase.delete(modUrl)
    }
}

modManager.on('listMods', (guildId, callback) => {
    let mods = []

    for (const [, mod] of modDatabase.entries()) {
        if (mod.guilds.has(guildId)) {
            mods.push(mod)
        }
    }

    callback(mods)
})

modManager.on('listNotifications', (callback) => {
    callback(notificationDatabase)
})

modManager.on('listNotificationsForGuildId', (guildId, callback) => {
    let notifications = notificationDatabase.get(guildId)

    callback(notifications)
})

modManager.on('listChannelsForGuildId', (guildId, callback) => {
    let channels = notificationDatabase.get(guildId).channels

    callback(channels)
})

modManager.on('deleteAll', (guildId, callback) => {
    deleteAll(guildId)
    modManager.emit('saveModsToCache')
    modManager.emit('saveNotificationsToCache')

    callback()
})

modManager.on('monitorMods', (newMods, guildId) => {
    deleteGuild(guildId) // Clear existing mods being monitored on this server

    for (const newMod in newMods) {
        if (modDatabase.has(newMod)) {
            newMods[newMod]['guilds'].forEach(modDatabase.get(newMod)['guilds'].add, modDatabase.get(newMod)['guilds']) // TODO does this block?
        } else {
            newMods[newMod]['guilds'] = new Set(newMods[newMod]['guilds'])
            newMods[newMod]['lastChecked'] = moment.unix(0).format()
            newMods[newMod]['lastModified'] = moment.unix(0).format()

            modDatabase.set(newMod, newMods[newMod])
        }
    }

    modManager.emit('saveModsToCache')
})

modManager.on('setNotifications', (guildId, notifications, callback) => {
    notificationDatabase.set(guildId, notifications)

    modManager.emit('saveNotificationsToCache')

    callback()
})

modManager.on('loadModsFromCache', (cachedMods) => {
    logger.info('Loading mods from cache.')

    for (const cachedMod in cachedMods) {
        cachedMods[cachedMod]['guilds'] = new Set(cachedMods[cachedMod]['guilds'])
    }
    modDatabase = new Map(Object.entries(cachedMods))

    logger.info(`${modDatabase.size} mods loaded from cache.`)
})

modManager.on('saveModsToCache', async () => {
    logger.debug('Saving mods to cache.')

    let tmpMap = structuredClone(modDatabase)
    for (const [, value] of tmpMap.entries()) {
        value['guilds'] = [...value['guilds']]
    }

    try {
        await cache.writeModsToCache(Object.fromEntries(tmpMap))
    } catch (e) {
        logger.error(e)
    }
})

modManager.on('loadNotificationsFromCache', (cachedNotifications) => {
    logger.info('Loading notifications from cache.')

    notificationDatabase = new Map(Object.entries(cachedNotifications))

    logger.info(`${notificationDatabase.size} notifications loaded from cache.`)
})

modManager.on('saveNotificationsToCache', async () => {
    logger.info('Saving notifications to cache.')

    try {
        await cache.writeNotificationsToCache(Object.fromEntries(notificationDatabase))
    } catch (e) {
        logger.error(e)
    }
})

modManager.on('checkMod', (client) => {
    // If no mods are in the database, don't do anything
    if (modDatabase.size === 0) {
        logger.warn('No mods to check.')
        return
    }

    // If the queue is empty, reload it
    if (modQueue.length === 0) for (const modUrl of modDatabase.keys()) modQueue.push(modUrl)

    let modUrl = modQueue.shift()
    let mod = modDatabase.get(modUrl)
    if (!mod) {
        logger.error(`Cannot find mod ${modUrl}.`)
        return
    }
    logger.info(`Checking mod '${mod.name}' (${modUrl}).`)

    util.refreshMod(modUrl)
        .then((htmlLastModified) => {
            const cachedLastModified = moment(mod.lastModified)

            logger.debug(`Mod '${mod.name}', cached last updated: '${cachedLastModified}', html last updated: '${htmlLastModified}'.`)
            if (cachedLastModified.isSame(moment.unix(0).format())) {
                logger.debug(`Mod '${mod.name}', first update check, setting last updated to '${htmlLastModified}'.`)
                mod.lastModified = htmlLastModified.format()
            } else if (htmlLastModified.isAfter(cachedLastModified)) {
                mod.lastModified = htmlLastModified.format()

                logger.info(`Mod '${mod.name}' was updated! Last update changed from '${cachedLastModified}' to '${htmlLastModified}'.`)

                const modUrlId = new URL(modUrl).searchParams.get('id')
                util.downloadFile(`https://steamcommunity.com/sharedfiles/filedetails/changelog/${modUrlId}.`)
                    .then(util.parseSteamWorkshopChangelogHtml)
                    .then((changelog) => {
                        if (changelog === '') return ''

                        return changelog.replaceAll('\n', '\r\n')
                    })
                    .catch((e) => {
                        logger.error(e)
                        return `Error: Could not load changelog: ${e.message}`
                    })
                    .then(async (changelog) => {
                        for (const guildId of mod.guilds) {
                            let notifications = notificationDatabase.get(guildId)
                            if (notifications === undefined) {
                                logger.warn(`Not notifying anyone on guild ID '${guildId}', no notifications set.'`)
                                return
                            }

                            let notificationsString = await util.buildNotificationString(notifications, guildId, client)

                            const message = `Mod \`${mod.name}\` (<${modUrl}>) was updated! ${notificationsString}`
                            const splitChangelog = util.splitString(changelog, 1900)
                            for (const channelId of notifications.channelIds) {
                                client.channels.cache
                                    .get(channelId)
                                    .send(message)
                                    .catch((e) => logger.error(e))
                                for (let changelogPart of splitChangelog) {
                                    if (changelogPart.length === 0) continue

                                    changelogPart = `\`\`\`${changelogPart}\`\`\``

                                    client.channels.cache
                                        .get(channelId)
                                        .send(changelogPart)
                                        .catch((e) => logger.error(e))
                                }
                            }
                        }
                    })
            } else {
                logger.debug(`Mod '${mod.name}', was not updated.`)
            }

            mod.lastChecked = moment().format()
            modManager.emit('saveModsToCache')
        })
        .catch((e) => logger.error(e))
})

export { modManager }
