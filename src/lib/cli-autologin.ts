import shx = require('shelljs')
import fs = require('fs')
import path = require('path')
import Utils from '../classes/utils'
import Pacman from '../classes/pacman'
import { serialize } from 'v8'

// Comando per avviare ubiquity: sudo --preserve-env DBUS_SESSION_BUS_ADDRESS, XDG_RUNTIME sh -c 'calamares'


/**
 * 
 * @param distro 
 * @param version 
 * @param user 
 * @param userPasswd 
 * @param rootPasswd 
 * @param chroot 
 */

const startMessage = 'eggs-start-message'
const stopMessage = 'eggs-stop-message'

export async function add(distro: string, version: string, user: string, userPasswd: string, rootPasswd: string, chroot = '/') {
    if (Utils.isSystemd()) {
        /**
         * Systemd
         */
        const fileOverride = `${chroot}/etc/systemd/system/getty@.service.d/override.conf`
        const dirOverride = path.dirname(fileOverride)
        if (fs.existsSync(dirOverride)) {
            shx.exec(`rm ${dirOverride} -rf`)
        }
        shx.exec(`mkdir ${dirOverride}`)
        let content = ''
        content += '[Service]' + '\n'
        content += 'ExecStart=' + '\n'
        content += 'ExecStart=-/sbin/agetty --noclear --autologin ' + user + ' %I $TERM' + '\n'
        fs.writeFileSync(fileOverride, content)
        shx.exec(`chmod +x ${fileOverride}`)
        await issueAdd(distro, version, user, userPasswd, rootPasswd, chroot)
        await motdAdd(distro, version, user, userPasswd, rootPasswd, chroot)

    } else if (Utils.isSysvinit()) {
        /**
         * sysvinit
         */
        const inittab = chroot + '/etc/inittab'
        const search = `1:2345:respawn:/sbin/getty`
        // const replace = `1:2345:respawn:/sbin/getty --noclear --autologin ${user} 38400 tty1`
        const replace = `1:2345:respawn:/sbin/getty --autologin ${user} 38400 tty1`
        let content = ''
        const lines = fs.readFileSync(inittab, 'utf-8').split('\n')
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(search)) {
                lines[i]= replace
            }
            content += lines[i] + '\n'
        }
        fs.writeFileSync(inittab, content, 'utf-8')
        await issueAdd(distro, version, user, userPasswd, rootPasswd, chroot)
        await motdAdd(distro, version, user, userPasswd, rootPasswd, chroot)
    }
}

/**
 * 
 * @param chroot 
 * @param user 
 */
export async function remove(chroot = '/') {
    if (Utils.isSystemd()) {
        /**
         * Systemd
         */
        const fileOverride = `${chroot}/etc/systemd/system/getty@.service.d/override.conf`
        const dirOverride = path.dirname(fileOverride)
        if (fs.existsSync(dirOverride)) {
            shx.exec(`rm ${dirOverride} -rf`)
        }
        msgRemove(`${chroot}/etc/motd`)
        msgRemove(`${chroot}/etc/issue`)

    } else if (Utils.isSysvinit()) {
        /**
        * sysvinit
        */
         const inittab = chroot + '/etc/inittab'
         const search = `1:2345:respawn:/sbin/getty`
         // const replace = `1:2345:respawn:/sbin/getty --noclear 38400 tty1         `
         const replace = `1:2345:respawn:/sbin/getty 38400 tty1         `
         let content = ''
         const lines = fs.readFileSync(inittab, 'utf-8').split('\n')
         for (let i = 0; i < lines.length; i++) {
             if (lines[i].includes(search)) {
                 lines[i]= replace
             }
             content += lines[i] + '\n'
         }
         fs.writeFileSync(inittab, content, 'utf-8')
         msgRemove(`${chroot}/etc/motd`)
         msgRemove(`${chroot}/etc/issue`)
    } // to add: openrc and runit for Devuan
}

/**
 * 
 * @param chroot 
 */
 export async function motdAdd(distro: string, version: string, user: string, userPasswd: string, rootPasswd: string, chroot = '/') {
    const fileMotd = `${chroot}/etc/motd`

    let installer = 'sudo eggs install'
    if (Pacman.packageIsInstalled('calamares')) {
        if (Pacman.packageIsInstalled('kde-desktop-plasma')) {
            installer = 'startplasma-wayland and run calamares'
        }else if (Pacman.packageIsInstalled('xfce4')) {
            installer = 'startxfce4 and run calamares'
        }
    }

    msgRemove(fileMotd)

    let eggsMotd = fs.readFileSync(fileMotd, 'utf-8')
    eggsMotd += startMessage + '\n'
    eggsMotd += `This is a live ${distro}/${version} system created by penguin's eggs.\n`
    eggsMotd += `You are logged as ${user}, your password is: ${userPasswd}. root password: ${rootPasswd}\n`
    eggsMotd += `to install the system: ${installer}\n`
    eggsMotd += stopMessage
    fs.writeFileSync(fileMotd, eggsMotd)
}

/**
 * 
 * @param distro 
 * @param version 
 * @param user 
 * @param userPasswd 
 * @param rootPasswd 
 * @param chroot 
 */
 export async function issueAdd(distro: string, version: string, user: string, userPasswd: string, rootPasswd: string, chroot = '/') {
    const fileIssue = `${chroot}/etc/issue`
    msgRemove(fileIssue)

    let eggsIssue = fs.readFileSync(fileIssue, 'utf-8')
    eggsIssue += startMessage + '\n'
    eggsIssue += `This is a live ${distro}/${version} system created by penguin's eggs.\n`
    eggsIssue += `You can login with user: ${user} and password: ${userPasswd}. root password: ${rootPasswd}\n`
    eggsIssue += stopMessage
    fs.writeFileSync(fileIssue, eggsIssue)
}


/**
 * 
 * @param path 
 */
 export async function msgRemove(path: string) {
    let rows = fs.readFileSync(path, 'utf-8').split('\n')
    let cleaned = ''

    let remove = false
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].includes(startMessage)) {
            remove = true
        }
        if (!remove) {
            if (rows[i] !== '') {
                cleaned += rows[i] + '\n'
            }
        }
        if (rows[i].includes(stopMessage)) {
            remove = false
        }
    }
    fs.writeFileSync(path, cleaned, 'utf-8')
}