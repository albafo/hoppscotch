import Vue from "vue"
import { v4 as uuidv4 } from "uuid"

export const SETTINGS_KEYS = [
  /**
   * Whether or not to enable scrolling to a specified element, when certain
   * actions are triggered.
   */
  "SCROLL_INTO_ENABLED",

  /**
   * Normally, section frames are multicolored in the UI
   * to emphasise the different sections.
   * This setting allows that to be turned off.
   */
  "FRAME_COLORS_ENABLED",

  /**
   * Whether or not requests should be proxied.
   */
  "PROXY_ENABLED",

  /**
   * The URL of the proxy to connect to for requests.
   */
  "PROXY_URL",
  /**
   * The security key of the proxy.
   */
  "PROXY_KEY",

  /**
   * An array of properties to exclude from the URL.
   * e.g. 'auth'
   */
  "URL_EXCLUDES",

  /**
   * A boolean value indicating whether to use the browser extensions
   * to run the requests
   */
  "EXTENSIONS_ENABLED",

  /**
   * A boolean value indicating whether to use the URL bar experiments
   */
  "EXPERIMENTAL_URL_BAR_ENABLED",
]

export const state = () => ({
  settings: {
    currentProject: null,
  },
  collections: [
    {
      name: "My Collection",
      folders: [],
      requests: [],
    },
  ],
  environments: [
    {
      name: "My Environment Variables",
      variables: [],
    },
  ],
  editingEnvironment: {},
  selectedRequest: {},
  selectedRequestOptions: {},
  preRequestScript: "",
  editingRequest: {},
  projects: [
    {
      name: "My Project",
      collections: [],
    },
  ],
})

export const getters = {
  collections: (state) => {
    return state.currentProject !== null ? state.currentProject.collections : state.collections
  },
}

export const mutations = {
  applySetting({ settings }, setting) {
    if (setting === null || !(setting instanceof Array) || setting.length !== 2) {
      throw new Error("You must provide a setting (array in the form [key, value])")
    }

    const [key, value] = setting
    // Do not just remove this check.
    // Add your settings key to the SETTINGS_KEYS array at the
    // top of the file.
    // This is to ensure that application settings remain documented.
    if (!SETTINGS_KEYS.includes(key)) {
      throw new Error(`The settings structure does not include the key ${key}`)
    }

    settings[key] = value
  },

  removeVariables({ editingEnvironment }, value) {
    editingEnvironment.variables = value
  },

  setEditingEnvironment(state, value) {
    state.editingEnvironment = { ...value }
  },

  setVariableKey({ editingEnvironment }, { index, value }) {
    editingEnvironment.variables[index].key = value
  },

  setVariableValue({ editingEnvironment }, { index, value }) {
    editingEnvironment.variables[index].value = testValue(value)
  },

  removeVariable({ editingEnvironment }, variables) {
    editingEnvironment.variables = variables
  },

  addVariable({ editingEnvironment }, value) {
    editingEnvironment.variables.push(value)
  },

  replaceEnvironments(state, environments) {
    state.environments = environments
  },

  importAddEnvironments(state, { environments, confirmation, project }) {
    const duplicateEnvironment = environments.some((item) => {
      return project.environments.some((item2) => {
        return item.name.toLowerCase() === item2.name.toLowerCase()
      })
    })
    if (duplicateEnvironment) {
      this.$toast.info("Duplicate environment")
      return
    }
    project.environments = [...project.environments, ...environments]
    let index = 0
    for (let environment of project.environments) {
      environment.environmentIndex = index
      index += 1
    }
    this.$toast.info(confirmation, {
      icon: "folder_shared",
    })
  },

  removeEnvironment({ environments }, { index, project }) {
    project.environments.splice(index, 1)
  },

  saveEnvironment({ environments }, payload) {
    const { environment, environmentIndex, project } = payload
    const { name } = environment
    const duplicateEnvironment =
      project.environments.length === 1
        ? false
        : environments.some(
            (item) =>
              item.environmentIndex !== environmentIndex &&
              item.name.toLowerCase() === name.toLowerCase()
          )
    if (duplicateEnvironment) {
      this.$toast.info("Duplicate environment")
      return
    }
    project.environments[environmentIndex] = environment
  },

  replaceProjects(state, projects) {
    state.projects = projects
  },

  replaceCollections(state, { collections, project }) {
    project.collections = collections
  },

  setCurrentProject(state, project) {
    state.settings.currentProject = project
  },

  importCollections(state, { collections, project }) {
    project.collections = [...project.collections, ...collections]

    let index = 0
    for (let collection of collections) {
      collection.collectionIndex = index
      index += 1
    }
  },

  addNewProject({ projects }, project) {
    const { name } = project
    if (isDuplicatedName(projects, name)) {
      this.$toast.info("Duplicate project")
      return
    }
    let pr = {
      name: "",
      collections: [],
      environments: [],
      id: uuidv4(),
      adding: true,
      ...times(),
      ...project,
    }
    projects.unshift(pr)
  },

  removeProject(state, index) {
    state.projects.splice(index, 1)
  },

  editProject(state, { index, editProject }) {
    if (isDuplicatedName(state.projects, editProject.name)) {
      this.$toast.info("Duplicate project")
      return
    }
    state.projects[index] = {
      ...state.projects[index],
      name: editProject.name,
      editing: true,
      ...times(),
    }
  },

  addNewCollection(state, { project, collection }) {
    const { name } = collection
    if (project) {
      if (isDuplicatedName(project.collections, name)) {
        this.$toast.info("Duplicate collection")
        return
      }
      let cl = {
        name: "",
        folders: [],
        requests: [],
        ...collection,
      }

      project.collections.push(cl)
    }
  },

  removeCollection(state, payload) {
    const { collectionIndex, project } = payload
    if (project) {
      project.collections.splice(collectionIndex, 1)
    }
  },

  editCollection(state, { project, collection, collectionIndex }) {
    if (project) {
      if (isDuplicatedName(project.collections, collection.name)) {
        this.$toast.info("Duplicate collection")
        return
      }
      project.collections[collectionIndex] = collection
    }
  },

  addFolder(state, payload) {
    const { name, folder } = payload

    const newFolder = {
      name: name,
      requests: [],
      folders: [],
    }
    folder.folders.push(newFolder)
  },

  editFolder(state, payload) {
    const { collectionIndex, folder, folderIndex, folderName, project } = payload
    const collection = project.collections[collectionIndex]

    let parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      Vue.set(parentFolder.folders, folderIndex, folder)
    }
  },

  removeFolder(state, payload) {
    const { collectionIndex, folderIndex, folderName, project } = payload
    const collection = project.collections[collectionIndex]

    let parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      parentFolder.folders.splice(folderIndex, 1)
    }
  },

  editRequest(state, payload) {
    const collections = payload.project.collections

    const {
      requestCollectionIndex,
      requestFolderName,
      requestFolderIndex,
      requestNew,
      requestIndex,
    } = payload

    let collection = collections[requestCollectionIndex]

    if (requestFolderIndex === -1) {
      Vue.set(collection.requests, requestIndex, requestNew)
      return
    }

    let folder = findFolder(requestFolderName, collection, false)
    Vue.set(folder.requests, requestIndex, requestNew)
  },

  saveRequestAs(state, payload) {
    const collections = payload.project?.collections

    const { request, collectionIndex, folderName, requestIndex } = payload

    const specifiedCollection = collectionIndex !== undefined
    const specifiedFolder = folderName !== undefined
    const specifiedRequest = requestIndex !== undefined

    if (specifiedCollection && specifiedFolder && specifiedRequest) {
      const folder = findFolder(folderName, collections[collectionIndex])
      Vue.set(folder.requests, requestIndex, request)
    } else if (specifiedCollection && specifiedFolder && !specifiedRequest) {
      const folder = findFolder(folderName, collections[collectionIndex])
      const requests = folder.requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    } else if (specifiedCollection && !specifiedFolder && specifiedRequest) {
      const requests = collections[collectionIndex].requests
      Vue.set(requests, requestIndex, request)
    } else if (specifiedCollection && !specifiedFolder && !specifiedRequest) {
      const requests = collections[collectionIndex].requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    }
  },

  removeRequest(state, payload) {
    const collections = payload.project.collections

    const { collectionIndex, folderName, requestIndex } = payload
    let collection = collections[collectionIndex]

    if (collection.name === folderName) {
      collection.requests.splice(requestIndex, 1)
      return
    }
    let folder = findFolder(folderName, collection, false)

    if (folder) {
      folder.requests.splice(requestIndex, 1)
    }
  },

  selectRequest(state, { request, ...options }) {
    state.selectedRequest = Object.assign({}, request)
    state.selectedRequestOptions = options
  },

  selectPreRequestScript(state, { script }) {
    state.preRequestScript = script
  },

  moveRequest(state, payload) {
    const collections =
      state.currentProject !== null ? state.currentProject.collections : state.collections

    const {
      oldCollectionIndex,
      newCollectionIndex,
      newFolderIndex,
      newFolderName,
      oldFolderName,
      requestIndex,
    } = payload

    const isCollection = newFolderIndex === -1
    const oldCollection = collections[oldCollectionIndex]
    const newCollection = collections[newCollectionIndex]
    const request = findRequest(oldFolderName, oldCollection, requestIndex)

    if (isCollection) {
      newCollection.requests.push(request)
      return
    }

    if (!isCollection) {
      const folder = findFolder(newFolderName, newCollection, false)
      if (folder) {
        folder.requests.push(request)
        return
      }
    }
  },
}

function isDuplicatedName(object, name) {
  let duplicated = false
  object.forEach((item) => {
    if (item.name.toLowerCase() === name.toLowerCase()) {
      duplicated = true
      return
    }
  })
  return duplicated
}

function testValue(myValue) {
  try {
    return JSON.parse(myValue)
  } catch (ex) {
    // Now we know it's a string just leave it as a string value.
    return myValue
  }
}

function findRequest(folderName, currentFolder, requestIndex) {
  let selectedFolder, result

  if (folderName === currentFolder.name) {
    let request = currentFolder.requests[requestIndex]
    currentFolder.requests.splice(requestIndex, 1)
    return request
  } else {
    for (let i = 0; i < currentFolder.folders.length; i += 1) {
      selectedFolder = currentFolder.folders[i]

      result = findRequest(folderName, selectedFolder, requestIndex)

      if (result !== false) {
        return result
      }
    }
    return false
  }
}

function findFolder(folderName, currentFolder, returnParent, parentFolder) {
  let selectedFolder, result

  if (folderName === currentFolder.name && returnParent) {
    return parentFolder
  } else if (folderName === currentFolder.name && !returnParent) {
    return currentFolder
  } else {
    for (let i = 0; i < currentFolder.folders.length; i++) {
      selectedFolder = currentFolder.folders[i]

      result = findFolder(folderName, selectedFolder, returnParent, currentFolder)

      if (result !== false) {
        return result
      }
    }
    return false
  }
}
function times() {
  return {
    updated_at: new Date().toISOString(),
  }
}

function removeObjectById(arr, obj) {
  arr.forEach((ele, index) => {
    if (ele.id === obj.id) {
      arr.splice(index, 1)
    }
  })
}
