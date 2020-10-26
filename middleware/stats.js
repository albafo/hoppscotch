import { EVENTS, fb } from "@/helpers/fb"
import { projectsService } from "@/services/projects"
import { settingsService } from "@/services/settings"

export default function ({ store }) {
  fb.on(EVENTS.settingsLoaded, async (settings) => {
    if (settings.length < 4) {
      console.log("syncing projects...")
      await projectsService.syncFbProjects(store)
      fb.writeSettings("syncProjects", true)
      fb.writeSettings("syncHistory", true)
      fb.writeSettings("syncCollections", true)
      fb.writeSettings("syncEnvironments", true)
    } else {
      console.log("loading projects from fb...")
      fb.on(EVENTS.projectsLoaded, (projects) => {
        store.commit("postwoman/replaceProjects", JSON.parse(JSON.stringify(projects)))
      })
    }
  })
}
