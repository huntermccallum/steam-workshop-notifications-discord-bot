import * as util from './util.js'
import moment from 'moment'

const notificationsCacheFile = './data/notifications_cache.json'
const modsCacheFile = './data/mods_cache.json'
const spotRepCacheFile = './data/spotrep_cache.json'

export const createModsCache = function () {
    return util.fileExists(modsCacheFile).then((exists) => {
        return !exists ? util.writeFile(modsCacheFile, '{}') : Promise.resolve(exists)
    })
}

export const writeModsToCache = function (mods) {
    return util.writeFile(modsCacheFile, JSON.stringify(mods))
}

export const readModsFromCache = function () {
    return util.readFile(modsCacheFile).then(JSON.parse)
}

export const createNotificationsCache = function () {
    return util.fileExists(notificationsCacheFile).then((exists) => {
        return !exists ? util.writeFile(notificationsCacheFile, '{}') : Promise.resolve(exists)
    })
}

export const writeNotificationsToCache = function (notifications) {
    return util.writeFile(notificationsCacheFile, JSON.stringify(notifications))
}

export const readNotificationsFromCache = function () {
    return util.readFile(notificationsCacheFile).then(JSON.parse)
}

export const createSpotRepCache = function () {
    return util.fileExists(spotRepCacheFile).then((exists) => {
        return !exists ? util.writeFile(spotRepCacheFile, `{ "lastUpdate": "${moment().format()}"}`) : Promise.resolve(exists)
    })
}

export const writeSpotRepToCache = function (spotRep) {
    return util.writeFile(spotRepCacheFile, JSON.stringify(spotRep))
}

export const readSpotRepFromCache = function () {
    return util.readFile(spotRepCacheFile).then(JSON.parse)
}
