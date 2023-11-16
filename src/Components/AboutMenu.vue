<script setup lang="ts">
defineEmits(['close'])
</script>

<template>
    <div class="menu">
        <a class="link" href="https://github.com/jacobsjo/minecraft-jigsaw-preview" target="_blank"
            @click="$emit('close')">Source on GitHub</a>
        <a class="link" href="https://github.com/jacobsjo/minecraft-jigsaw-preview/issues" target="_blank"
            @click="$emit('close')">Report Issue</a>
        <a class="link" href="https://jacobsjo.eu" target="_blank" @click="$emit('close')">Other Tools</a>
        <a class="link" href="https://github.com/sponsors/jacobsjo/" target="_blank" @click="$emit('close')">Sponsor Me</a>
        <a class="link" href="https://jacobsjo.eu/about.html" target="_blank" @click="$emit('close')">About</a>
        <a class="link" href="OTHER_LICENSES.txt" target="_blank" @click="$emit('close')">Licenses</a>
    </div>
</template>

<style scoped>
.menu {
    position: absolute;
    right: 0;
    top: 2.6rem;
    width: 10rem;
    height: auto;
    z-index: 10;
    background-color: #2b2b2b;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.3rem;
    border-radius: 0 0 0 0.3rem;
}

a {
    color: white;
    text-decoration: none;
    padding: 0.3rem;
    display: block;
    background-color: #424242;
    border-radius: 0.3rem;
    transition: 0.3s;
}

a:hover {
    background-color: #777777;
    text-decoration: underline;
}
</style>