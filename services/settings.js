import { fb } from "~/helpers/fb"

export class Settings {
  getFbSetting(name) {
    let result = null
    fb.currentSettings.forEach((item) => {
      if (item.name === name) {
        result = item
      }
    })
    return result
  }
}

export const settingsService = new Settings()
