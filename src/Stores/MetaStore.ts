import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { Constants } from '../Util/Constants';


export const MetaStore = defineStore('meta', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersion = urlParams.get('version')
    const mcVersion = ref(Constants.MINECRAFT_VERSIONS.includes(urlVersion) ? urlVersion : '1_21_3')
    updateUrl()

    watch(mcVersion, () => {
        updateUrl()
    })

    function updateUrl(){
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('version', mcVersion.value);
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?" + urlParams;
        window.history.replaceState({path:newurl},'',newurl);
    }

    return { mcVersion }
})