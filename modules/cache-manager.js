import * as util from './util.js'

const notificationsCacheFile = './data/notifications_cache.json';
const modsCacheFile = './data/mods_cache.json';
const spotRepCacheFile = './data/spotrep_cache.json';

async function createCacheIfNotExists(filePath, initialData = '{}') {
    try {
        const exists = await util.fileExists(filePath);
        if (!exists) {
            await util.writeFile(filePath, initialData);
        }
        return exists;
    } catch (error) {
        console.error(`Error creating cache for ${filePath}:`, error);
        throw error;
    }
}

async function writeToCache(filePath, data) {
    try {
        await util.writeFile(filePath, JSON.stringify(data));
    } catch (error) {
        console.error(`Error writing to cache ${filePath}:`, error);
        throw error;
    }
}

async function readFromCache(filePath) {
    try {
        const data = await util.readFile(filePath);
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading from cache ${filePath}:`, error);
        throw error;
    }
}

export const createModsCache = () => createCacheIfNotExists(modsCacheFile);
export const writeModsToCache = (mods) => writeToCache(modsCacheFile, mods);
export const readModsFromCache = () => readFromCache(modsCacheFile);

export const createNotificationsCache = () => createCacheIfNotExists(notificationsCacheFile);
export const writeNotificationsToCache = (notifications) => writeToCache(notificationsCacheFile, notifications);
export const readNotificationsFromCache = () => readFromCache(notificationsCacheFile);

export const createSpotRepCache = () => {
    const initialData = `{ "lastUpdate": "${new Date().toISOString()}" }`;
    return createCacheIfNotExists(spotRepCacheFile, initialData);
}
export const writeSpotRepToCache = (spotRep) => writeToCache(spotRepCacheFile, spotRep);
export const readSpotRepFromCache = () => readFromCache(spotRepCacheFile);
