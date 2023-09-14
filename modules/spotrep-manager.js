import EventEmitter from 'events';
import moment from 'moment';
import * as cache from './cache-manager.js';
import * as util from './util.js';
import { modManager } from './mod-manager.js';
import { logger } from './logger.js';

const spotRepManager = new EventEmitter();
let spotRepDatabase = new Map();

spotRepManager.on('loadSpotRepFromCache', (cachedSpotRep) => {
    logger.info('Loading SpotRep from cache.');
    spotRepDatabase = new Map(Object.entries(cachedSpotRep));
    logger.info(`SpotRep loaded from cache, last update: ${spotRepDatabase.get('lastUpdate')}.`);
});

spotRepManager.on('saveSpotRepToCache', async () => {
    logger.info('Saving SpotRep to cache.');
    try {
        await cache.writeSpotRepToCache(Object.fromEntries(spotRepDatabase));
    } catch (e) {
        logger.error(e);
    }
});

spotRepManager.on('checkSpotRep', async (client) => {
    try {
        const spotRepData = await util.downloadFile('https://dev.arma3.com/spotrep');
        const parsedData = await util.parseArmaSpotRepHtml(spotRepData);

        if (parsedData['time'].isBefore(moment(spotRepDatabase.get('lastUpdate')))) {
            logger.debug('SpotRep not updated');
            return;
        }

        logger.info('SpotRep updated');
        spotRepDatabase.set('lastUpdate', moment().format());

        const changelog = await util.downloadFile(parsedData['link']);
        const parsedChangelog = await util.parseArmaSpotRepPostHtml(changelog);

        modManager.emit('listNotifications', async (notificationsMap) => {
            for (const [guildId, notifications] of notificationsMap.entries()) {
                let notificationsString;
                try {
                    notificationsString = await util.buildNotificationString(notifications, guildId, client);
                } catch (e) {
                    logger.error(`Could not build notification string for guild ID '${guildId}': ${e}`);
                    continue;
                }

                const message = `Arma was updated \\`${parsedData['info']}\\` (<${parsedData['link']}>) was updated! ${notificationsString}`;
                const splitChangelog = util.splitString(parsedChangelog, 1900, '\\n');

                for (const channelId of notifications.channelIds) {
                    client.channels.cache
                        .get(channelId)
                        .send(message)
                        .catch((e) => logger.error(e));

                    for (let changelogPart of splitChangelog) {
                        if (changelogPart.length === 0) continue;

                        changelogPart = `\`\`\`${changelogPart}\`\`\``;

                        client.channels.cache
                            .get(channelId)
                            .send(changelogPart)
                            .catch((e) => logger.error(e));
                    }
                }
            }
        });

        spotRepManager.emit('saveSpotRepToCache');

    } catch (e) {
        logger.error(`Error checking SpotRep: ${e.message}`);
    }
});

export { spotRepManager };
