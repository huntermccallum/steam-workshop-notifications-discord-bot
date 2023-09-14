import EventEmitter from 'events'
import moment from 'moment'
import * as cache from './cache-manager.js'
import * as util from './util.js'
import { modManager } from './mod-manager.js'
import { logger } from './logger.js'

const spotRepManager = new EventEmitter()
let spotRepDatabase = new Map()

spotRepManager.on('loadSpotRepFromCache', (cachedSpotRep) => {
    logger.info('Loading SpotRep from cache.')

    spotRepDatabase = new Map(Object.entries(cachedSpotRep))

    logger.info(`SpotRep loaded from cache, last update: ${spotRepDatabase.get('lastUpdate')}.`)
})

spotRepManager.on('saveSpotRepToCache', async () => {
    logger.info('Saving SpotRep to cache.')

    try {
        await cache.writeSpotRepToCache(Object.fromEntries(spotRepDatabase))
    } catch (e) {
        logger.error(e)
    }
})

spotRepManager.on('checkSpotRep', async (client) => {
    let spotRepData
    try {
        spotRepData = await util.downloadFile('https://dev.arma3.com/spotrep').then((html) => util.parseArmaSpotRepHtml(html))
    } catch (e) {
        logger.error(`Could not parse ArmA SpotRep: ${e}`)
        return
    }

    if (spotRepData['time'].isBefore(moment(spotRepDatabase.get('lastUpdate')))) {
        logger.debug('SpotRep not updated')
        return
    }

    logger.info('SpotRep updated')
    spotRepDatabase.set('lastUpdate', moment().format())

    let changelog
    try {
        changelog = await util.downloadFile(spotRepData['link']).then((html) => util.parseArmaSpotRepPostHtml(html))
    } catch (e) {
        logger.error(`Could not parse ArmA SpotRep changelog: ${e}`)
        return
    }

    modManager.emit('listNotifications', async (notificationsMap) => {
        for (const [guildId, notifications] of notificationsMap.entries()) {
            let notificationsString
            try {
                notificationsString = await util.buildNotificationString(notifications, guildId, client)
            } catch (e) {
                logger.error(`Could not build notification string for guild ID '${guildId}': ${e}`)
                continue
            }

            const message = `Arma was updated \`${spotRepData['info']}\` (<${spotRepData['link']}>) was updated! ${notificationsString}`
            const splitChangelog = util.splitString(changelog, 1900, '\n')

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

    spotRepManager.emit('saveSpotRepToCache')
})

export { spotRepManager }
