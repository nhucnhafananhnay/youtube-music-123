import { getAccessToken, getStoredUser } from "../services/auth.js";

const STORAGE_PREFIX = "music-playlists:";
let selectedTrack = null;

function getStorageKey() {
    const user = getStoredUser();
    let identifier = "";

    if (user) {
        identifier = user.id || user.email || "";
    }

    if (!identifier) {
        return "";
    }

    return `${STORAGE_PREFIX}${identifier}`;
}

export function getPlaylists() {
    const key = getStorageKey();
    if (!key) {
        return [];
    }

    try {
        const playlists = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(playlists) ? playlists : [];
    } catch {
        return [];
    }
}

function savePlaylists(playlists) {
    const key = getStorageKey();
    if (!key) {
        throw new Error("Hãy đăng nhập để tạo playlist.");
    }
    localStorage.setItem(key, JSON.stringify(playlists));
    window.dispatchEvent(new Event("playlists:changed"));
}

export function createPlaylist(name, track = null) {
    const title = name.trim();
    if (!title) {
        throw new Error("Nhập tên playlist.");
    }

    let playlistId;
    if (globalThis.crypto && globalThis.crypto.randomUUID) {
        playlistId = globalThis.crypto.randomUUID();
    } else {
        playlistId = `${Date.now()}-${Math.random()}`;
    }

    const playlist = {
        id: playlistId,
        title,
        tracks: [],
        createdAt: new Date().toISOString()
    };

    if (track) {
        playlist.tracks.push(track);
    }

    const playlists = getPlaylists();
    playlists.push(playlist);
    savePlaylists(playlists);
    return playlist;
}

function getTrackKey(track) {
    return track.id || track._id || track.slug || track.audioUrl || track.videoId || track.title;
}

export function addTrackToPlaylist(playlistId, track) {
    const playlists = getPlaylists();
    let playlist;

    for (const item of playlists) {
        if (item.id === playlistId) {
            playlist = item;
            break;
        }
    }

    if (!playlist) {
        throw new Error("Không tìm thấy playlist.");
    }

    const trackKey = getTrackKey(track);
    for (const item of playlist.tracks) {
        if (getTrackKey(item) === trackKey) {
            return false;
        }
    }

    playlist.tracks.push(track);
    savePlaylists(playlists);
    return true;
}

export function deletePlaylist(playlistId) {
    const playlists = getPlaylists();
    const remainingPlaylists = [];

    for (const playlist of playlists) {
        if (playlist.id !== playlistId) {
            remainingPlaylists.push(playlist);
        }
    }

    savePlaylists(remainingPlaylists);
}

export function removeTrackFromPlaylist(playlistId, track) {
    const key = getTrackKey(track);
    const playlists = getPlaylists();
    let playlist;

    for (const item of playlists) {
        if (item.id === playlistId) {
            playlist = item;
            break;
        }
    }

    if (!playlist) {
        return;
    }

    const remainingTracks = [];
    for (const item of playlist.tracks) {
        if (getTrackKey(item) !== key) {
            remainingTracks.push(item);
        }
    }

    playlist.tracks = remainingTracks;
    savePlaylists(playlists);
}

function closePlaylistDialog() {
    document.querySelector("#playlistDialog")?.close();
}

function renderPlaylistChoices() {
    const list = document.querySelector("#playlistChoices");
    const message = document.querySelector("#playlistDialogMessage");
    if (!list || !message) return;

    list.replaceChildren();
    message.textContent = "";

    if (!getAccessToken()) {
        message.textContent = "Đăng nhập để lưu playlist trên thiết bị này.";
        return;
    }

    if (!selectedTrack) return;

    const playlists = getPlaylists();
    if (!playlists.length) {
        message.textContent = "Chưa có playlist. Tạo playlist mới bên dưới.";
        return;
    }

    for (const playlist of playlists) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "playlist-choice";
        button.appendChild(document.createTextNode(playlist.title));

        const trackCount = document.createElement("span");
        trackCount.textContent = `${playlist.tracks.length} bài`;
        button.appendChild(trackCount);

        button.addEventListener("click", () => {
            try {
                const added = addTrackToPlaylist(playlist.id, selectedTrack);
                message.textContent = added ? `Đã thêm vào “${playlist.title}”.` : "Bài hát đã có trong playlist.";
                closePlaylistDialog();
            } catch (error) {
                message.textContent = error.message;
            }
        });
        list.appendChild(button);
    }
}

export function openPlaylistDialog(track = null) {
    selectedTrack = track;
    const dialog = document.querySelector("#playlistDialog");
    const trackTitle = document.querySelector("#playlistDialogTrack");
    const trackSection = document.querySelector("#playlistChoicesSection");
    const nameInput = document.querySelector("#newPlaylistName");

    if (!dialog || !getAccessToken()) {
        window.dispatchEvent(new Event("auth:required"));
        return;
    }

    trackTitle.textContent = track?.title || "Tạo playlist mới";
    trackSection.hidden = !track;
    nameInput.value = "";
    renderPlaylistChoices();
    dialog.showModal();
}

export function initPlaylistControls() {
    const closeButton = document.querySelector("#closePlaylistDialog");
    const createForm = document.querySelector("#playlistCreateForm");
    const nameInput = document.querySelector("#newPlaylistName");
    const message = document.querySelector("#playlistDialogMessage");

    window.addEventListener("playlist:add-current", (event) => openPlaylistDialog(event.detail));
    closeButton?.addEventListener("click", closePlaylistDialog);

    createForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
            const playlist = createPlaylist(nameInput.value, selectedTrack);
            message.textContent = selectedTrack
                ? `Đã tạo “${playlist.title}” và thêm bài hát đang phát.`
                : `Đã tạo playlist “${playlist.title}”.`;
            nameInput.value = "";
            closePlaylistDialog();
        } catch (error) {
            message.textContent = error.message;
        }
    });

    window.addEventListener("auth:changed", renderPlaylistChoices);
    window.addEventListener("playlists:changed", renderPlaylistChoices);
}
