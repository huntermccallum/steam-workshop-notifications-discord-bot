import https from 'https'
import { parse } from 'node-html-parser'
import moment from 'moment'
import { convert } from 'html-to-text'
import fs from 'fs'
import { logger } from './logger.js'

const downloadFile = function (url) {
    return new Promise((resolve, reject) => {
        url = url.replace('http://', 'https://')
        let data = []
        https
            .get(url, (response) => {
                response.on('data', (chunk) => {
                    data.push(chunk)
                })
                response.on('end', () => {
                    resolve(Buffer.concat(data).toString())
                })
            })
            .on('error', function (e) {
                // Handle errors
                reject(e)
            })
    })
}

const parseModsHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html)
        const modData = root
            .querySelectorAll('tr[data-type="ModContainer"]')
            .map((x) => {
                let mods = {}
                mods[x.querySelector('[data-type="Link"]').rawText] = {
                    name: x.querySelector('[data-type="DisplayName"]').rawText,
                }

                return mods
            })
            .reduce((previousValue, currentValue) => {
                return Object.assign(previousValue, currentValue)
            })

        resolve(modData)
    })
}

const parseSteamWorkshopHtml = function (html) {
    return new Promise((resolve) => {
        const root = parse(html)

        let rawLastModified
        try {
            // The date/time that is returned here will not match local date time due to JavaScript not being executed
            rawLastModified = root.querySelector('.detailsStatsContainerRight').querySelector('.detailsStatRight:last-child').rawText
        } catch (e) {
            logger.error('Last modified date not found, mod set to private?') // TODO Propagate this error and handle it correctly
            throw e
        }

        // Mods released in current year do not have the year in timestamp
        let splitRawLastModified = rawLastModified.split(' ')
        if (splitRawLastModified.length === 4) {
            splitRawLastModified.splice(2, 0, moment().year().toString())
            rawLastModified = splitRawLastModified.join(' ')
        }

        const lastModified = moment(rawLastModified, 'D-MMM-YYYY hh:mma')
        const now = moment()

        if (lastModified > now) {
            // If date is in the future, subtract one year
            logger.warn('Last modified is in the future, subtracting one year')
            resolve(lastModified.subtract(1, 'year'))
        } else {
            resolve(lastModified)
        }
    })
}

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

const readFile = function (filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (e, data) => {
            if (e) reject(e)
            else resolve(data)
        })
    })
}

const writeFile = function (filename, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, content, 'utf8', (e) => {
            if (e) reject(e)
            else resolve(content)
        })
    })
}

const fileExists = function (filename) {
    return new Promise((resolve) => {
        fs.access(filename, fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false)
            }

            resolve(true)
        })
    })
}

const splitString = function (string, size, pattern = '\r\n') {
    let splitStrings = []
    while (string.length > size) {
        let lastNewLineIndex = string.slice(0, size).lastIndexOf(pattern) // TODO what if this pattern is not found
        if (lastNewLineIndex === -1) lastNewLineIndex = size - 1

        const splitString = string.slice(0, lastNewLineIndex)
        splitStrings.push(splitString)
        string = string.slice(lastNewLineIndex, string.length)
    }
    splitStrings.push(string)

    return splitStrings
}

const buildNotificationString = async function (notifications, guildId, client) {
    let notificationsString = 'No members or roles to notify.'
    if (notifications) {
        let members = await Promise.all(notifications.memberIds.map((id) => client.guilds.fetch(guildId).then((guild) => guild.members.fetch(id))))
        let roles = await Promise.all(notifications.roleIds.map((id) => client.guilds.fetch(guildId).then((guild) => guild.roles.fetch(id))))
        if (roles.length > 0 || members.length > 0) notificationsString = `Notifying ${members.map((x) => x.toString()).join(' ')} ${roles.map((x) => x.toString()).join(' ')}`
    }

    return notificationsString
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
