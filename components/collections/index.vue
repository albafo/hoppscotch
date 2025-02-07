<!--
TODO:
    - probably refactor and pass event arguments to modals directly without unpacking
-->

<template>
  <pw-section class="yellow" :label="$t('collections')" ref="collections">
    <div class="show-on-large-screen">
      <input aria-label="Search" type="search" :placeholder="$t('search')" v-model="filterText" />
      <!-- <button class="icon">
        <i class="material-icons">search</i>
      </button> -->
    </div>
    <add-collection :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <edit-collection
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <add-folder
      :show="showModalAddFolder"
      :folder="editingFolder"
      @hide-modal="displayModalAddFolder(false)"
    />
    <edit-folder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <edit-request
      :show="showModalEditRequest"
      :collection-index="editingCollectionIndex"
      :folder-index="editingFolderIndex"
      :folder-name="editingFolderName"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <import-export-collections
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />

    <div class="row-wrapper">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayModalImportExport(true)">
          {{ $t("import_export") }}
        </button>
        <!-- <a
          href="https://github.com/hoppscotch/hoppscotch/wiki/Collections"
          target="_blank"
          rel="noopener"
        >
          <button class="icon" v-tooltip="'Wiki'">
            <i class="material-icons">help_outline</i>
          </button>
        </a> -->
      </div>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(collection, index) in filteredCollections" :key="collection.name">
          <collection
            :name="collection.name"
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            :isFiltered="filterText.length > 0"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @select-collection="$emit('use-collection', collection)"
          />
        </li>
      </ul>
    </div>
    <ul class="flex-col" v-if="filterText && filteredCollections.length === 0">
      <li>
        <label>{{ $t("nothing_found") }} "{{ filterText }}"</label>
      </li>
    </ul>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 232px);
}
</style>

<script>
import { fb } from "~/helpers/fb"
import { projectsService } from "@/services/projects"

export default {
  props: {
    doc: Boolean,
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      editingCollection: undefined,
      editingCollectionIndex: undefined,
      editingFolder: undefined,
      editingFolderName: undefined,
      editingFolderIndex: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
    }
  },
  computed: {
    collections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
    },
    filteredCollections() {
      const collections = projectsService.getCurrentProject(this.$store)?.collections

      if (!this.filterText) return collections

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (let collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (let request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText)) filteredRequests.push(request)
        }
        for (let folder of collection.folders) {
          const filteredFolderRequests = []
          for (let request of folder.requests) {
            if (request.name.toLowerCase().includes(filterText))
              filteredFolderRequests.push(request)
          }
          if (filteredFolderRequests.length > 0) {
            const filteredFolder = Object.assign({}, folder)
            filteredFolder.requests = filteredFolderRequests
            filteredFolders.push(filteredFolder)
          }
        }

        if (filteredRequests.length + filteredFolders.length > 0) {
          const filteredCollection = Object.assign({}, collection)
          filteredCollection.requests = filteredRequests
          filteredCollection.folders = filteredFolders
          filteredCollections.push(filteredCollection)
        }
      }

      return filteredCollections
    },
  },
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalAdd = this.showModalEdit = this.showModalImportExport = this.showModalAddFolder = this.showModalEditFolder = this.showModalEditRequest = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    displayModalAddFolder(shouldDisplay) {
      this.showModalAddFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditFolder(shouldDisplay) {
      this.showModalEditFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditRequest(shouldDisplay) {
      this.showModalEditRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    editCollection(collection, collectionIndex) {
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.displayModalEdit(true)
    },
    addFolder(payload) {
      const { folder } = payload
      this.$data.editingFolder = folder
      this.displayModalAddFolder(true)
    },
    editFolder(payload) {
      const { collectionIndex, folder, folderIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolder = folder
      this.$data.editingFolderIndex = folderIndex
      this.displayModalEditFolder(true)
    },
    editRequest(payload) {
      const { collectionIndex, folderIndex, folderName, request, requestIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.displayModalEditRequest(true)
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
