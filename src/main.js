import "./style.css";
import { mountAppShell } from "./components/appShell.js";

const app = document.querySelector("#app");
mountAppShell(app);

async function startApp() {
    const header = await import("./components/header.js");
    const sidebar = await import("./components/sidebar.js");
    const search = await import("./components/search.js");
    const audioPlayer = await import("./components/audioPlayer.js");
    const playlistControls = await import("./components/playlistControls.js");
    const router = await import("./libs/router.js");

    header.initHeader();
    sidebar.initSidebar();
    search.initSearch();
    audioPlayer.initializeAudioPlayer();
    playlistControls.initPlaylistControls();
    router.startRouter(document.querySelector("#content"));
    header.loadCurrentUser();
}

startApp();
