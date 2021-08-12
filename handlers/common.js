const { default: axios } = require("axios")
const config = require('../config.json')
const fs = require('fs')
const { _l } = require("./telegram/i18n")
const { createHash } = require('crypto')
/**
 * ForEach with async
 * @param {Array} array 
 * @param {Function} callback 
 */
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}
/**
 * honsole => huggy console
 * record error and report
 */
const honsole = {
    dev: function (...args) {
        if (process.env.dev) {
            console.log(...args)
        }
    },
    log: function (...args) {
        console.log(...args)
    },
    error: function (...args) {
        console.error(...args)
    },
    warn: function (...args) {
        console.warn(...args)
    }
}
/**
 * download file
 * @param {*} url 
 * @param {*} id 
 * @param {*} try_time 
 * @returns 
 */
let dw_queue_list = []
async function download_file(url, id, force = false, try_time = 0) {
    if (url.includes(config.pixiv.ugoiraurl)) {
        return url + '?' + (+new Date())
    }
    if (try_time > 5) {
        return false
    }
    url = url.replace('https://i-cf.pximg.net/', 'https://i.pximg.net/')
    let filename = url.split('/').slice(-1)[0]
    if (url.includes('.zip')) {
        filename = id + '.zip'
    }
    if (fs.existsSync(`./tmp/file/${filename}`) && !force) {
        return `./tmp/file/${filename}`
    }
    if (dw_queue_list.length > 4 || dw_queue_list.includes(url)) {
        await sleep(1000)
        honsole.dev('dw in queue', dw_queue_list.indexOf(url), dw_queue_list.length, url)
        return await download_file(url, id, force, try_time)
    }
    dw_queue_list.push(url)
    try {
        let data = (await axios.get(url, {
            responseType: 'blob',
            headers: {
                'User-Agent': config.pixiv.ua,
                'Referer': 'https://www.pixiv.net'
            }
        })).data
        fs.writeFileSync(`./tmp/file/${filename}`, data)
        dw_queue_list.splice(dw_queue_list.indexOf(id), 1)
        return `./tmp/file/${filename}`
    } catch (error) {
        honsole.warn(error)
        await sleep(1000)
        dw_queue_list.splice(dw_queue_list.indexOf(id), 1)
        return await download_file(url, id, try_time + 1)
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function generate_token(user_id, time = +new Date()) {
    return createHash('sha1').update(`${config.tg.salt}${user_id}${time}`).digest('hex').toString()
}
const exec = require('util').promisify((require('child_process')).exec)
module.exports = {
    asyncForEach,
    download_file,
    sleep,
    generate_token,
    honsole,
    exec
}