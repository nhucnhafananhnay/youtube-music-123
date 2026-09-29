import view from "./view.html?raw";
import { makeElement } from "../../utils/dom.js";
import { navigateTo } from "../../libs/router.js";
import { getAccessToken } from "../../services/auth.js";
import { deletePlaylist, getPlaylists, openPlaylistDialog, removeTrackFromPlaylist } from "../../components/playlistControls.js";
import { playCollection } from "../../components/audioPlayer.js";
import { showDetails } from "../details/index.js";

let openPlaylistId = "";
let libraryListenerReady = false;


function renderPlaylistTracks(playlist, list) {
    list.replaceChildren();

    const backButton = makeElement("button", "library-back", "‹ Tất cả playlist");
    backButton.type = "button";
    backButton.addEventListener("click", () => {
        openPlaylistId = "";
        renderLibrary();
    });

    const heading = makeElement("h2", "library-detail-title", playlist.title);
    list.append(backButton, heading);

    if (!playlist.tracks.length) {
        list.appendChild(makeElement("p", "library-empty-message", "Playlist này chưa có bài hát."));
        return;
    }

    const tracks = makeElement("div", "library-tracks");
    for (const track of playlist.tracks) {
        const row = makeElement("article", "library-track-row");
        const cover = makeElement("img", "library-track-cover");
        cover.src = track.thumbnails?.[0] || track.thumb || "";
        cover.alt = "";

        const info = makeElement("button", "library-track-info");
        info.type = "button";
        info.appendChild(makeElement("strong", "", track.title || track.name || "Bài hát"));
        info.appendChild(makeElement("span", "", track.artists?.join(", ") || track.albumName || ""));
        info.addEventListener("click", () => showDetails({ ...track, type: track.type || "song" }));

        const actions = makeElement("div", "library-track-actions");
        const playButton = makeElement("button", "library-track-action", "▶");
        playButton.type = "button";
        playButton.setAttribute("aria-label", `Phát ${track.title || track.name || "bài hát"}`);
        playButton.addEventListener("click", () => playCollection({ ...track, type: track.type || "song" }));

        const removeButton = makeElement("button", "library-track-action", "×");
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", `Xóa ${track.title || track.name || "bài hát"} khỏi playlist`);
        removeButton.addEventListener("click", () => {
            removeTrackFromPlaylist(playlist.id, track);
            const playlists = getPlaylists();
            let updatedPlaylist;

            for (const item of playlists) {
                if (item.id === playlist.id) {
                    updatedPlaylist = item;
                    break;
                }
            }

            if (updatedPlaylist) renderPlaylistTracks(updatedPlaylist, list);
            else renderLibrary();
        });

        actions.append(playButton, removeButton);
        row.append(cover, info, actions);
        tracks.appendChild(row);
    }
    list.appendChild(tracks);
}

function renderLibrary() {
    const list = document.querySelector("#libraryList");
    if (!list) return;

    list.replaceChildren();
    const playlists = getPlaylists();

    if (openPlaylistId) {
        let selectedPlaylist;

        for (const playlist of playlists) {
            if (playlist.id === openPlaylistId) {
                selectedPlaylist = playlist;
                break;
            }
        }

        if (selectedPlaylist) {
            renderPlaylistTracks(selectedPlaylist, list);
            return;
        }
        openPlaylistId = "";
    }

    if (!playlists.length) {
        const empty = makeElement("div", "empty-library");
        empty.append(
            makeElement("h2", "", "Chưa có playlist"),
            makeElement("p", "", "Tạo playlist hoặc thêm bài đang phát từ trình phát nhạc.")
        );
        list.appendChild(empty);
        return;
    }

    const grid = makeElement("div", "library-playlists-grid");
    for (const playlist of playlists) {
        const card = makeElement("article", "library-playlist-card");
        const openButton = makeElement("button", "library-playlist-open");
        openButton.type = "button";
        const cover = makeElement("div", "library-playlist-cover", "♫");
        const info = makeElement("span", "library-playlist-info");
        info.append(
            makeElement("strong", "", playlist.title),
            makeElement("span", "", `${playlist.tracks.length} bài hát`)
        );
        openButton.append(cover, info);
        openButton.addEventListener("click", () => {
            openPlaylistId = playlist.id;
            renderPlaylistTracks(playlist, list);
        });

        const deleteButton = makeElement("button", "library-playlist-delete", "×");
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `Xóa playlist ${playlist.title}`);
        deleteButton.addEventListener("click", () => {
            if (window.confirm(`Xóa playlist “${playlist.title}”?`)) {
                deletePlaylist(playlist.id);
            }
        });

        card.append(openButton, deleteButton);
        grid.appendChild(card);
    }
    list.appendChild(grid);
}

export function initLibrary() {
    if (!getAccessToken()) {
        navigateTo("/login");
        return;
    }

    document.querySelector("#createPlaylistButton")?.addEventListener("click", () => openPlaylistDialog());
    if (!libraryListenerReady) {
        window.addEventListener("playlists:changed", renderLibrary);
        libraryListenerReady = true;
    }
    renderLibrary();
}

export async function renderPage(container) {
    container.innerHTML = view;
    return initLibrary();
}
