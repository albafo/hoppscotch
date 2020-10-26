import { fb } from "~/helpers/fb"

export class Projects {
  async syncFbProjects(store) {
    if (fb.userIsSync()) {
      await fb.writeProjects(JSON.parse(JSON.stringify(store.state.postwoman.projects)))
    }
  }

  async syncCurrentProject(store) {
    let currentProject = this.getCurrentProject(store)
    if (fb.userIsSync() && currentProject) {
      await fb.writeProject(JSON.parse(JSON.stringify(currentProject)))
    }
  }

  async addProject(store, project) {
    store.commit("postwoman/addNewProject", JSON.parse(JSON.stringify(project)))
    await this.syncFbProjects(store)
  }

  async editProject(store, index, editProject) {
    store.commit("postwoman/editProject", { index, editProject })
    await this.syncFbProjects(store)
  }

  async deleteProject(store, index) {
    store.commit("postwoman/removeProject", index)
    await this.syncFbProjects(store)
  }

  setCurrentProject(store, project) {
    store.commit("postwoman/setCurrentProject", project)
  }

  getCurrentProject(store) {
    let project = null
    let id = store.state.postwoman.settings.currentProject
    let currentProjects = store.state.postwoman.projects
    currentProjects.forEach(function (item) {
      if (item.id === id) {
        project = item
      }
    })
    if (id && !project && fb.currentProjects.length > 0) {
      this.setCurrentProject(store, null)
    }

    return project
  }
}

export const projectsService = new Projects()
