<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("edit_collection") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <closeIcon class="material-icons" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <ul>
        <li>
          <input
            type="text"
            v-model="name"
            :placeholder="editingCollection.name"
            @keyup.enter="saveCollection"
          />
        </li>
      </ul>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveCollection">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"
import { projectsService } from "@/services/projects"

export default {
  components: {
    closeIcon,
  },
  props: {
    show: Boolean,
    editingCollection: Object,
    editingCollectionIndex: Number,
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    saveCollection() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      const collectionUpdated = {
        ...this.$props.editingCollection,
        name: this.$data.name,
        label: this.$data.name,
      }
      this.$store.commit("postwoman/editCollection", {
        project: projectsService.getCurrentProject(this.$store),
        collection: collectionUpdated,
        collectionIndex: this.$props.editingCollectionIndex,
      })
      this.$emit("hide-modal")
      projectsService.syncCurrentProject(this.$store)
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
