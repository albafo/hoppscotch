<template>
  <div>
    <div
      :class="['row-wrapper', dragging ? 'drop-zone' : '']"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
          <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name }}</span>
        </button>
      </div>
      <v-popover>
        <button class="tooltip-target icon" v-tooltip.left="$t('more')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button class="icon" @click="$emit('add-folder', { folder })" v-close-popover>
              <i class="material-icons">create_new_folder</i>
              <span>{{ $t("new_folder") }}</span>
            </button>
          </div>
          <div>
            <button
              class="icon"
              @click="$emit('edit-folder', { folder, folderIndex, collectionIndex })"
              v-close-popover
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="removeFolder" v-close-popover>
              <deleteIcon class="material-icons" />
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>

    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-brdColor"
        >
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :folder-name="folder.name"
            :request-index="index"
            :doc="doc"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
      <ul v-if="folder.folders && folder.folders.length" class="flex-col">
        <li v-for="(subFolder, subFolderIndex) in folder.folders" :key="subFolder.name">
          <folder
            :folder="subFolder"
            :folder-index="subFolderIndex"
            :collection-index="collectionIndex"
            :doc="doc"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"
import { projectsService } from "@/services/projects"

export default {
  components: { deleteIcon },
  name: "folder",
  props: {
    folder: Object,
    folderIndex: Number,
    collectionIndex: Number,
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
    }
  },
  methods: {
    toggleShowChildren() {
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      if (!confirm(this.$t("are_you_sure_remove_folder"))) return
      this.$store.commit("postwoman/removeFolder", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folder.name,
        folderIndex: this.$props.folderIndex,
        project: projectsService.getCurrentProject(this.$store),
      })
      projectsService.syncCurrentProject(this.$store)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const oldCollectionIndex = dataTransfer.getData("oldCollectionIndex")
      const oldFolderIndex = dataTransfer.getData("oldFolderIndex")
      const oldFolderName = dataTransfer.getData("oldFolderName")
      const requestIndex = dataTransfer.getData("requestIndex")

      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: this.$props.folderIndex,
        newFolderName: this.$props.folder.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
      })
      this.syncCollections()
    },
  },
}
</script>
