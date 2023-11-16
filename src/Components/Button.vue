<script setup lang="ts">
    const props = defineProps(['modelValue'])
    const emit = defineEmits(['update:modelValue', 'press'])

    function press() {
        emit('update:modelValue', !props.modelValue)
        emit('press')
    }
</script>
<template>
    <div
        class="button"
        tabindex="0"
        :class="{
            activated: modelValue
        }"    
        @click="press"
        @keypress.enter="press"
    ><slot></slot></div>
</template>

<style>
.button {
    text-align: center;
}

.button > * {
    height: 100%;
}

</style>