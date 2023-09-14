import https from 'https'
import { parse } from 'node-html-parser'
import moment from 'moment'
import { convert } from 'html-to-text'
import fs from 'fs'
import { logger } from './logger.js'

const downloadFile = url => {
    return new Promise((resolve, reject) => {
        url = url.replace('http://', 'https://')
        let data = []

        https.get(url, response => {
            response.on('data', chunk => data.push(chunk))
            response.on('end', () => resolve(Buffer.concat(data).toString()))
        }).on('error', reject)
    })
}

const parseModsHtml = async html => {
    const root = parse(html)
    const modData = root
        .querySelectorAll('tr[data-type="ModContainer"]')
        .map(x => ({ [x.querySelector('[data-type="Link"]').rawText]: { name: x.querySelector('[data-type="DisplayName"]').rawText } }))
        .reduce((prev, curr) => ({ ...prev, ...curr }), {})

    return modData
}

const parseSteamWorkshopHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html);

        let rawLastModified;
        try {
            rawLastModified = root.querySelector('.detailsStatsContainerRight').querySelector('.detailsStatRight:last-child').rawText;
        } catch (e) {
            logger.error('Last modified date not found, mod set to private?');
            throw e;
        }
	logger.debug(`Extracted raw date from HTML: ${rawLastModified}`);

        let splitRawLastModified = rawLastModified.split(' ');
        if (splitRawLastModified.length === 4) {
            splitRawLastModified.splice(2, 0, moment().year().toString());
            rawLastModified = splitRawLastModified.join(' ');
        }

        // Split the date parts
        const [month, day, year, time, meridiem] = rawLastModified.split(/[\s@]+/);

        // Create a new Date object
	const formattedDateStr = `${month} ${day} ${year} ${time} ${meridiem}`;
	const lastModified = moment(formattedDateStr, "MMM D YYYY h:mma");
	// logger.debug(`Moment object from formatted string: ${lastModified.toString()}`);

        // Debugging: Log the value of the date
        // logger.debug(`Constructed Date object: ${formattedDateStr.toString()}`);

        // Convert the date into a moment object
	// logger.debug(`Moment object from constructed Date: ${lastModified.toString()}`);

        const now = moment();

        if (lastModified > now) {
            // If date is in the future, subtract one year
            logger.warn('Last modified is in the future, subtracting one year');
            resolve(lastModified.subtract(1, 'year'));
        } else {
            resolve(lastModified);
        }
    });
};

const parseSteamWorkshopChangelogHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html)
        const changelog = root.querySelector('.workshopAnnouncement ')

        let headLineElement = changelog.querySelector('.headline')
        let commentsElement = changelog.querySelector('.commentsLink')

        changelog.removeChild(headLineElement)
        changelog.removeChild(commentsElement)

        resolve(convert(changelog.toString(), { wordwrap: null }))
    })
}

const refreshMod = function (modUrl) {
    return downloadFile(modUrl).then((html) => parseSteamWorkshopHtml(html))
}

const parseArmaSpotRepHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html)

        const infoTag = root.querySelector('article').querySelector('div .dev-post-excerpt')
        const infoText = convert(infoTag.toString(), { wordwrap: null })

        const timeTag = root.querySelector('article').querySelector('time')
        const timeText = convert(timeTag.toString(), { wordwrap: null })
        const time = moment(timeText, 'MMMM D, YYYY')

        const linkTag = root.querySelector('article').querySelector('header').querySelector('a')
        const link = linkTag.attributes['href']

        resolve({ info: infoText.replace('\r\n', '').replace('\n', ''), time: time, link: link })
    })
}

const parseArmaSpotRepPostHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html)
        const content = root.querySelector('div .post-content')
        resolve(convert(content.toString(), { wordwrap: null }))
    })
}

const readFile = filename => 
    new Promise((resolve, reject) => 
        fs.readFile(filename, 'utf8', (err, data) => err ? reject(err) : resolve(data))
    )

const writeFile = (filename, content) => 
    new Promise((resolve, reject) => 
        fs.writeFile(filename, content, 'utf8', err => err ? reject(err) : resolve(content))
    )

const fileExists = filename => 
    new Promise(resolve => 
        fs.access(filename, fs.constants.F_OK, err => resolve(!err))
    )

const splitString = (string, size, pattern = '\r\n') => {
    const splitStrings = []

    while (string.length > size) {
        let lastNewLineIndex = string.slice(0, size).lastIndexOf(pattern)
        if (lastNewLineIndex === -1) lastNewLineIndex = size - 1

        splitStrings.push(string.slice(0, lastNewLineIndex))
        string = string.slice(lastNewLineIndex)
    }

    splitStrings.push(string)
    return splitStrings
}

const buildNotificationString = async (notifications, guildId, client) => {
    if (!notifications) return 'No members or roles to notify.'

    const guild = await client.guilds.fetch(guildId)
    const members = await Promise.all(notifications.memberIds.map(id => guild.members.fetch(id)))
    const roles = await Promise.all(notifications.roleIds.map(id => guild.roles.fetch(id)))

    const membersString = members.map(member => member.toString()).join(' ')
    const rolesString = roles.map(role => role.toString()).join(' ')

    return membersString || rolesString ? `Notifying ${membersString} ${rolesString}` : 'No members or roles to notify.'
}

export {
    downloadFile,
    parseModsHtml,
    parseSteamWorkshopHtml,
    parseSteamWorkshopChangelogHtml,
    refreshMod,
    parseArmaSpotRepHtml,
    parseArmaSpotRepPostHtml,
    readFile,
    writeFile,
    fileExists,
    splitString,
    buildNotificationString,
}
