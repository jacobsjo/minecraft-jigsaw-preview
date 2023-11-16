<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue';
import Render from './Components/Render.vue'
import MenuBar from './Components/MenuBar.vue';
import InfoBox from './Components/InfoBox.vue';
import { SettingsStore } from './Stores/SettingsStore';
import { TimelineStore } from './Stores/TilelineStore';

const loaded = ref(false)

const settings = SettingsStore()
const timeline = TimelineStore()

onBeforeMount(async () => {
    loaded.value = true
})

onMounted(() => {
    window.addEventListener('keyup', async (evt: KeyboardEvent) => {
    if (evt.key === "ArrowLeft") {
      timeline.prevStep()
    } else if (evt.key === "ArrowRight") {
      timeline.nextStep()
    }
  }, true)
})

</script>

<template>
    <div class="layout" v-if="loaded">
        <MenuBar />
        <div class="main">
            <Render />
            <InfoBox v-if="settings.showInfobox" />
        </div>
    </div>
    <div class="layout loading" v-else>
        <p>Loading...</p>
    </div>
</template>

<style scoped>
.layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.loading {
    font-size: 5rem;
    color: white;
    align-items: center;
    justify-content: center;
}

.main {
    width: 100%;
    flex-grow: 1;
    position: relative;
}

p {
    height: fit-content;
}
</style>
