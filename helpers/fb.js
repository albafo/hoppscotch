import firebase from "firebase/app"
import "firebase/firestore"
import "firebase/auth"

// Initialize Firebase, copied from cloud console
const firebaseConfig = {
  apiKey: process.env.API_KEY || "AIzaSyCMsFreESs58-hRxTtiqQrIcimh4i1wbsM",
  authDomain: process.env.AUTH_DOMAIN || "postwoman-api.firebaseapp.com",
  databaseURL: process.env.DATABASE_URL || "https://postwoman-api.firebaseio.com",
  projectId: process.env.PROJECT_ID || "postwoman-api",
  storageBucket: process.env.STORAGE_BUCKET || "postwoman-api.appspot.com",
  messagingSenderId: process.env.MESSAGING_SENDER_ID || "421993993223",
  appId: process.env.APP_ID || "1:421993993223:web:ec0baa8ee8c02ffa1fc6a2",
  measurementId: process.env.MEASUREMENT_ID || "G-ERJ6025CEB",
}

export const EVENTS = {
  settingsLoaded: "SETTINGS_LOADED",
  projectsLoaded: "PROJECTS_LOADED",
}

export const authProviders = {
  google: () => new firebase.auth.GoogleAuthProvider(),
  github: () => new firebase.auth.GithubAuthProvider(),
}

export class FirebaseInstance {
  constructor(fbapp, authProviders) {
    this.app = fbapp
    this.authProviders = authProviders
    this.db = this.app.firestore()
    this.usersCollection = this.db.collection("users")

    this.currentUser = null
    this.currentFeeds = []
    this.currentSettings = []
    this.currentHistory = []
    this.currentCollections = []
    this.currentEnvironments = []
    this.currentProjects = []
    this.currentProject = null
    this.handlers = []

    this.app.auth().onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user

        this.currentUser.providerData.forEach((profile) => {
          let us = {
            updatedOn: new Date(),
            provider: profile.providerId,
            name: profile.displayName,
            email: profile.email,
            photoUrl: profile.photoURL,
            uid: profile.uid,
          }
          this.usersCollection
            .doc(this.currentUser.uid)
            .set(us)
            .catch((e) => console.error("error updating", us, e))
        })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("feeds")
          .orderBy("createdOn", "desc")
          .onSnapshot((feedsRef) => {
            const feeds = []
            feedsRef.forEach((doc) => {
              const feed = doc.data()
              feed.id = doc.id
              feeds.push(feed)
            })
            this.currentFeeds = feeds
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("settings")
          .onSnapshot((settingsRef) => {
            const settings = []
            settingsRef.forEach((doc) => {
              const setting = doc.data()
              setting.id = doc.id
              settings.push(setting)
            })
            this.currentSettings = settings
            this.throwEventHandler(EVENTS.settingsLoaded, settings)
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("history")
          .onSnapshot((historyRef) => {
            const history = []
            historyRef.forEach((doc) => {
              const entry = doc.data()
              entry.id = doc.id
              history.push(entry)
            })
            this.currentHistory = history
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("collections")
          .onSnapshot((collectionsRef) => {
            const collections = []
            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })
            if (collections.length > 0) {
              this.currentCollections = collections[0].collection
            }
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("environments")
          .onSnapshot((environmentsRef) => {
            const environments = []
            environmentsRef.forEach((doc) => {
              const environment = doc.data()
              environment.id = doc.id
              environments.push(environment)
            })
            if (environments.length > 0) {
              this.currentEnvironments = environments[0].environment
            }
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("projects")
          .orderBy("updated_at", "desc")
          .onSnapshot((projectsRef) => {
            const projects = []
            projectsRef.forEach((doc) => {
              const project = doc.data()
              project.id = doc.id
              projects.push(project)
            })
            this.currentProjects = projects
            this.throwEventHandler(EVENTS.projectsLoaded, this.currentProjects)
          })
      } else {
        this.currentUser = null
      }
    })
  }

  on(event, handler) {
    this.handlers[event] = handler
  }

  throwEventHandler(event, args) {
    if (event in this.handlers) {
      this.handlers[event](args)
    }
  }

  setCurrentProject(currentProject) {
    this.currentProject = currentProject
    this.currentProject.collections
      ? (this.currentCollections = this.currentProject.collections.sync.collection)
      : (this.currentCollections = [])
  }

  async signInUserWithGoogle() {
    return await this.app.auth().signInWithPopup(this.authProviders.google())
  }

  async signInUserWithGithub() {
    return await this.app.auth().signInWithPopup(this.authProviders.github())
  }

  async signInWithEmailAndPassword(email, password) {
    return await this.app.auth().signInWithEmailAndPassword(email, password)
  }

  async getSignInMethodsForEmail(email) {
    return await this.app.auth().fetchSignInMethodsForEmail(email)
  }

  async signOutUser() {
    if (!this.currentUser) throw new Error("No user has logged in")

    await this.app.auth().signOut()
    this.currentUser = null
  }

  processAddedEditedAndDeleted(arr, collection) {
    let self = this
    collection.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        //delete docs
        if (!arr.some((item) => item.id === doc.id)) {
          collection.doc(doc.id).delete()
        }
      })
    })

    arr.forEach(function (item, index) {
      if (item.editing || item.adding) {
        arr[index] = {
          ...item,
          ...self.getMetadata(),
        }
      }
    })
  }

  async writeProjects(projects) {
    this.processAddedEditedAndDeleted(
      projects,
      this.usersCollection.doc(this.currentUser.uid).collection("projects")
    )
    let batch = this.db.batch()
    projects.forEach((project) => {
      batch.set(
        this.usersCollection.doc(this.currentUser.uid).collection("projects").doc(project.id),
        project
      )
    })
    await batch.commit()
  }

  async writeProject(project) {
    project = {
      ...project,
      ...this.getMetadata(),
    }
    await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("projects")
      .doc(project.id)
      .set(project)
  }

  async deleteProyect(project) {
    await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("projects")
      .doc(project.id)
      .delete()
  }

  async writeFeeds(message, label) {
    const dt = {
      createdOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      message,
      label,
    }

    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("feeds").add(dt)
    } catch (e) {
      console.error("error inserting", dt, e)
      throw e
    }
  }

  async deleteFeed(id) {
    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("feeds").doc(id).delete()
    } catch (e) {
      console.error("error deleting", id, e)
      throw e
    }
  }

  async writeSettings(setting, value) {
    const st = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      name: setting,
      value,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("settings")
        .doc(setting)
        .set(st)
    } catch (e) {
      console.error("error updating", st, e)
      throw e
    }
  }

  async writeHistory(entry) {
    const hs = entry

    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("history").add(hs)
    } catch (e) {
      console.error("error inserting", hs, e)
      throw e
    }
  }

  async deleteHistory(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .delete()
    } catch (e) {
      console.error("error deleting", entry, e)
      throw e
    }
  }

  async clearHistory() {
    const { docs } = await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("history")
      .get()

    await Promise.all(docs.map((e) => this.deleteHistory(e)))
  }

  async toggleStar(entry, value) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .update({ star: value })
    } catch (e) {
      console.error("error deleting", entry, e)

      throw e
    }
  }

  async writeCollections(collection) {
    const cl = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      collection,
    }

    try {
      if (this.currentProject) {
        await this.usersCollection
          .doc(this.currentUser.uid)
          .collection("projects")
          .doc(this.currentProject.id)
          .update({
            collections: {
              sync: cl,
            },
          })
      } else {
        await this.usersCollection
          .doc(this.currentUser.uid)
          .collection("collections")
          .doc("sync")
          .set(cl)
      }
    } catch (e) {
      console.error("error updating", cl, e)

      throw e
    }
  }

  async writeEnvironments(environment) {
    const ev = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      environment,
    }

    try {
      if (this.currentProject) {
        await this.usersCollection
          .doc(this.currentUser.uid)
          .collection("projects")
          .doc(this.currentProject.id)
          .update({
            environemnts: {
              sync: ev,
            },
          })
      } else {
        await this.usersCollection
          .doc(this.currentUser.uid)
          .collection("environments")
          .doc("sync")
          .set(ev)
      }
    } catch (e) {
      console.error("error updating", ev, e)

      throw e
    }
  }
  userIsSync() {
    return this.currentUser !== null && this.currentSettings[0] && this.currentSettings[0].value
  }

  getMetadata() {
    if (this.userIsSync()) {
      return {
        author: this.currentUser.uid,
        author_name: this.currentUser.displayName,
        author_image: this.currentUser.photoURL,
        updated_at: new Date().toISOString(),
        adding: null,
        editing: null,
      }
    }

    return {}
  }
}

export const fb = new FirebaseInstance(firebase.initializeApp(firebaseConfig), authProviders)
