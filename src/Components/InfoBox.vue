<script setup lang="ts">
import { TimelineStore } from '../Stores/TilelineStore';
import { AppStateStore } from '../Stores/AppStateStore';
import { computed, watch } from 'vue';

const appState = AppStateStore()
const timeline = TimelineStore()

var piece = computed(() => {
    appState.updateCounter
    return appState.getWorld().getPiece(timeline.step)
})


</script>

<template>
    <div class="infobox">
        <div class="content">
            <div class="title">{{ piece.pieceInfo.pool }}</div>
            <div class="subtitle" v-if="piece.pieceInfo.fallback_from">Fallback from: {{ piece.pieceInfo.fallback_from }}</div>
            <div class="subtitle" v-if="piece.pieceInfo.aliased_from">Aliased from: {{ piece.pieceInfo.aliased_from }}</div>
            <div class="text">
                <pre><code>{{ piece.pieceInfo.element }}</code></pre>
            </div>
            <div class="text"><span class="label">Depth:</span> {{ piece.pieceInfo.depth }}</div>
            <div class="text"><span class="label">Joint:</span> {{ piece.pieceInfo.joint }} <span
                    v-if="piece.pieceInfo.joint_type">( {{ piece.pieceInfo.joint_type }} )</span></div>
            <div class="text"><span class="label">Selection Priority:</span> {{ piece.pieceInfo.selection_priority }}</div>
            <div class="text"><span class="label">Placement Priority:</span> {{ piece.pieceInfo.placement_priority }}</div>
            <div v-if="piece.failedPieces.length > 0">
                <hr class="dashed">
                <div class="label">Failed prior attemps:</div>
                <ul class="failed">
                    <li v-for="(failed, index) in piece.failedPieces" @click="timeline.toggleFailedStep(index)" :class="{selected: timeline.failedStep === index}" tabindex="1">{{ failed.name }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<style scoped>
.infobox {
    left: 1rem;
    top: 1rem;
    bottom: 1rem;
    position: absolute;
    margin: 0;
    padding: 0;
}

.content{
    width: 35rem;
    max-height: 100%;
    padding: 1rem;
    box-sizing: border-box;
    position: absolute;
    background-color: rgba(37, 37, 37, 0.671);
    color: white;
    border-radius: 0.3rem;
    overflow-y: scroll;
    overflow-x: hidden;
}

.content::-webkit-scrollbar {
  width: 6px;
}
.content::-webkit-scrollbar-track {
  background: transparent;
}

.content:hover::-webkit-scrollbar-thumb {
  background-color: rgba(200, 200, 200, 0.9);
  border-radius: 20px;
  border: 1px solid black;
}

.content::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0);
}


.title,
.subtitle {
    color: #d2ad48;
    font-size: 18pt;
    font-style: bold;
}

.subtitle {
    font-size: 11pt;
}

.label {
    color: #d2ad48;
}

.failed {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    list-style-type: none;
    margin: 0;
    margin-top: 0.5rem;
    padding: 0;
}

.failed>li {
    padding-top: 5pt;
    padding-bottom: 5pt;
    padding-left: 5pt;
    padding-right: 5pt;
    list-style-type: none;
    background-color: rgba(34, 34, 34, 0.534);
    margin-left: 10pt;
    margin-right: 10pt;
    cursor: pointer;
    text-overflow: ellipsis;
    overflow: clip;
    white-space: nowrap;
    border-radius: 0.5rem;
    transition: 0.3s;
}

.failed>li:hover {
    background-color: rgba(58, 57, 57, 0.664);
}

.failed>li.selected {
    background-color: rgba(150, 150, 27, 0.664);
}


</style>