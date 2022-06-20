/**
 * penguins-eggs: 
 * author: Piero Proietti
 * mail: piero.proietti@gmail.com
 *
 */

// packages
import fs from 'fs'
import mustache from 'mustache'
import Settings from './settings'
import Utils from './utils'

// libraries
import { exec } from '../lib/utils'
import Distro from './distro'

/**
 * I18n
 */
export default class I18n {
  verbose = false

  echo = {}

  toNull = ''

  chroot = '/'

  settings = {} as Settings

  constructor(chroot = '/', verbose = false) {
    this.verbose = verbose
    this.echo = Utils.setEcho(verbose)
    if (this.verbose) {
      this.toNull = ' > /dev/null 2>&1'
    }
    this.settings = new Settings()
    this.chroot = chroot
  }

  /**
   * 
   */
  async generate(fromSettings = true, defaultLocale = 'en_EN.UTF-8', locales = ['en_EN.UTF-8']) {
    if (fromSettings) {
      this.settings.load()
      defaultLocale = this.settings.config.locales_default
      locales = []
      for (let i = 0; i < this.settings.config.locales.length; i++) {
        locales.push(this.settings.config.locales[i])
      }
    }
   
    await this.localeGen(locales)
    await this.defaultLocale(defaultLocale)
    await this.localeConf(defaultLocale)
    await exec(`chroot ${this.chroot} /usr/sbin/locale-gen`, this.echo)
  }

  /**
   * localeGen
   */
  private async localeGen(locales: string[]) {
    const distro = new Distro()
    let supporteds: string [] =  []
    if (distro.familyId === 'debian') {

      supporteds = fs.readFileSync('/usr/share/i18n/SUPPORTED','utf-8').split('\n')
    } else if (distro.familyId === 'archlinux') {
      const findlocales = fs.readFileSync('/etc/locale.gen', 'utf-8').split('\n')
      for (let locale in findlocales ) {
        if (locale.substring(1,2) === '##') {
          // discard
        } else if (locale.substring(1,2) === '#a') {
          locale = locale.substring(2)
          supporteds.push(locale)
        }
      }
    }

    locales=['it_IT.UTF-8', 'en_US.UTF-8']
    let lgt = ''
    lgt += '# -------------------------------\n'
    lgt += '# File generated by penguins-eggs\n'
    lgt += '# -------------------------------\n'
    lgt += '# This file lists locales that you wish to have built. You can find a list\n'
    lgt += '# of valid supported locales at /usr/share/i18n/SUPPORTED, and you can add\n'
    lgt += '# user defined locales to /usr/local/share/i18n/SUPPORTED. If you change\n'
    lgt += '# this file, you need to rerun locale-gen.\n'

    for (const supported of supporteds) {
      for (const locale of locales){
        if (supported.includes(locale)) {
          lgt += `${supported}\n`
        } else {
          lgt += `# ${supported}\n`
        }
      }
    }
    const destGen = `${this.chroot}/etc/locale.gen`
    // console.log(lgt)
    fs.writeFileSync(destGen, lgt)
  }


  /**
   * /etc/locale.conf
   */
  private async localeConf(defaultLocale: string) {

    let lct = ''
    lct += '#  File generated by penguins-eggs\n'
    lct += 'LANG={{{locale}}}\n'
    lct += 'LC_ADDRESS={{{locale}}}\n'
    lct += 'LC_IDENTIFICATION={{{locale}}}\n'
    lct += 'LC_MEASUREMENT={{{locale}}}\n'
    lct += 'LC_MONETARY={{{locale}}}\n'
    lct += 'LC_NAME={{{locale}}}\n'
    lct += 'LC_NUMERIC={{{locale}}}\n'
    lct += 'LC_PAPER={{{locale}}}\n'
    lct += 'LC_TELEPHONE={{{locale}}}\n'
    lct += 'LC_TIME={{{locale}}}\n'
    const destConf = `${this.chroot}/etc/locale.conf`
    const view = {
      locale: defaultLocale
    }
    // console.log(mustache.render(lct, view))
    fs.writeFileSync(destConf, mustache.render(lct, view))
  }

  /**
 * /etc/default/locale
 */
  private async defaultLocale(defaultLocale: string) {
    let lct = ''
    lct += '#  File generated by penguins-eggs\n'
    lct += 'LANG={{{locale}}}\n'
    lct += 'LC_ADDRESS={{{locale}}}\n'
    lct += 'LC_IDENTIFICATION={{{locale}}}\n'
    lct += 'LC_MEASUREMENT={{{locale}}}\n'
    lct += 'LC_MONETARY={{{locale}}}\n'
    lct += 'LC_NAME={{{locale}}}\n'
    lct += 'LC_NUMERIC={{{locale}}}\n'
    lct += 'LC_PAPER={{{locale}}}\n'
    lct += 'LC_TELEPHONE={{{locale}}}\n'
    lct += 'LC_TIME={{{locale}}}\n'
    const destConf = `${this.chroot}/etc/default/locale`
    const view = {
      locale: defaultLocale
    }
    fs.writeFileSync(destConf, mustache.render(lct, view))
  }
}

