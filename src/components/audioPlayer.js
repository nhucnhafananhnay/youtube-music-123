import { fetchMusic } from "../services/music.js";
import { recordPlayedTrack } from "../services/history.js";
const audio = new Audio();

let currentQueue = [];
let currentTrackIndex = -1;
let requestNumber = 0;
let currentCollectionArtists = [];
let currentTrackIsYoutube = false;
let currentYoutubeVideoId = "";
let playbackRequestNumber = 0;
let playerElements;
let youtubeApiPromise;
let youtubePlayerPromise;
let youtubePlayer;
let isMuted = false;
let lastRecordedPlaybackRequest = 0;

function recordCurrentTrack() {
    if (lastRecordedPlaybackRequest === playbackRequestNumber) return;
    lastRecordedPlaybackRequest = playbackRequestNumber;
    recordPlayedTrack(currentQueue[currentTrackIndex]).catch(() => {});
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updatePlaybackButton() {
    const isPlaying = currentTrackIsYoutube
        ? youtubePlayer?.getPlayerState() === window.YT?.PlayerState?.PLAYING
        : !audio.paused;
    playerElements.togglePlayback.textContent = isPlaying ? "Ⅱ" : "▶";
    playerElements.togglePlayback.setAttribute(
        "aria-label",
        isPlaying ? "Tạm dừng" : "Phát nhạc"
    );
}

function updateProgress() {
    let currentTime = audio.currentTime;
    let duration = audio.duration;

    if (currentTrackIsYoutube && youtubePlayer) {
        currentTime = youtubePlayer.getCurrentTime();
        duration = youtubePlayer.getDuration();
    }

    playerElements.currentTime.textContent = formatTime(currentTime);
    playerElements.trackDuration.textContent = formatTime(duration);

    if (Number.isFinite(duration) && duration > 0) {
        playerElements.seekRange.value = String((currentTime / duration) * 100);
    }
}

function showPlayer() {
    playerElements.bar.hidden = false;
    document.querySelector("#content")?.classList.add("player-visible");
}

function closeAudioPlayer() {
    requestNumber++;
    playbackRequestNumber++;
    currentQueue = [];
    currentTrackIndex = -1;
    currentCollectionArtists = [];
    currentTrackIsYoutube = false;
    currentYoutubeVideoId = "";

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    pauseYouTubePlayer();

    playerElements.bar.hidden = true;
    playerElements.bar.classList.remove("youtube-active");
    document.querySelector("#content")?.classList.remove("player-visible", "youtube-active");
    playerElements.playerCover.removeAttribute("src");
    playerElements.playerTitle.textContent = "Chưa phát nhạc";
    playerElements.playerArtist.textContent = "Chọn một mục để nghe";
    playerElements.addToPlaylist.hidden = true;
    playerElements.previousTrack.disabled = true;
    playerElements.togglePlayback.disabled = true;
    playerElements.nextTrack.disabled = true;
    playerElements.currentTime.textContent = "0:00";
    playerElements.trackDuration.textContent = "0:00";
    playerElements.seekRange.value = "0";
    updatePlaybackButton();
}

async function fetchJsonWithRetry(endpoint) {
    let lastError;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetchMusic(endpoint, {
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                return await response.json();
            }

            lastError = response.status >= 500
                ? new Error(`API tạm thời gặp lỗi (${response.status}).`)
                : new Error("Không tìm thấy nội dung này.");

            if (response.status < 500) {
                break;
            }
        } catch (error) {
            lastError = error;
        }

        if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
    }

    throw lastError || new Error("Không thể tải nội dung này.");
}

async function getTracks(item) {
    if (item.audioUrl || item.videoId || item.youtubeVideoId || item.youtubeId) {
        return [item];
    }

    const identifier = item.slug || item.id || item._id;
    if (!identifier) {
        throw new Error("Không tìm thấy thông tin bài hát.");
    }

    const itemType = item.type || "song";
    let endpoint;
    if (itemType === "album") {
        endpoint = `/albums/details/${encodeURIComponent(identifier)}?limit=50`;
    } else if (itemType === "playlist") {
        endpoint = `/playlists/details/${encodeURIComponent(identifier)}?limit=50`;
    } else if (itemType === "video") {
        endpoint = `/videos/details/${encodeURIComponent(identifier)}`;
    } else {
        endpoint = `/songs/details/${encodeURIComponent(identifier)}`;
    }

    const data = await fetchJsonWithRetry(endpoint);
    let tracks = [];

    if (Array.isArray(data)) {
        tracks = data;
    } else if (Array.isArray(data.tracks)) {
        tracks = data.tracks;
    } else if (Array.isArray(data.items)) {
        tracks = data.items;
    } else if (data.track) {
        tracks = [data.track];
    }

    if (tracks.length === 0 && !Array.isArray(data)) {
        if (itemType === "video" && data.videoId) {
            tracks = [data];
        }
    }

    if (tracks.length === 0 && !Array.isArray(data)) {
        if (data.album && Array.isArray(data.album.tracks)) {
            tracks = tracks.concat(data.album.tracks);
        }

        if (Array.isArray(data.playlists)) {
            for (const playlist of data.playlists) {
                if (Array.isArray(playlist.tracks)) {
                    tracks = tracks.concat(playlist.tracks);
                }
            }
        }

        if (tracks.length === 0 && Array.isArray(data.related)) {
            tracks = data.related;
        }
    }

    const uniqueTracks = [];
    const trackKeys = [];

    for (let index = 0; index < tracks.length; index++) {
        const track = tracks[index];
        const trackKey = track.id || track.videoId || track.audioUrl || `track-${index}`;
        const existingIndex = trackKeys.indexOf(trackKey);

        if (existingIndex === -1) {
            trackKeys.push(trackKey);
            uniqueTracks.push(track);
        } else {
            uniqueTracks[existingIndex] = track;
        }
    }

    const playableTracks = [];
    for (const track of uniqueTracks) {
        const hasAudio = track.audioUrl && track.audioUrl.trim();
        const hasVideo = track.videoId || track.youtubeVideoId || track.youtubeId;

        if (hasAudio || hasVideo) {
            playableTracks.push(track);
        }
    }

    return playableTracks;
}

function loadYouTubeApi() {
    if (window.YT?.Player) {
        return Promise.resolve(window.YT);
    }

    if (!youtubeApiPromise) {
        youtubeApiPromise = new Promise((resolve, reject) => {
            const previousReadyHandler = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousReadyHandler?.();
                resolve(window.YT);
            };

            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.onerror = () => reject(new Error("Không tải được YouTube Player API."));
            document.head.appendChild(script);
        });
    }

    return youtubeApiPromise;
}

function getYouTubePlayer() {
    if (!youtubePlayerPromise) {
        youtubePlayerPromise = loadYouTubeApi().then((youtube) => new Promise((resolve, reject) => {
            youtubePlayer = new youtube.Player("youtubePlayer", {
                width: "200",
                height: "200",
                videoId: "",
                playerVars: {
                    controls: 1,
                    playsinline: 1,
                    rel: 0
                },
                events: {
                    onReady(event) {
                        youtubePlayer = event.target;
                        resolve(youtubePlayer);
                    },
                    onStateChange(event) {
                        updatePlaybackButton();
                        updateProgress();

                        if (event.data === window.YT.PlayerState.PLAYING) {
                            recordCurrentTrack();
                        }

                        if (event.data === window.YT.PlayerState.ENDED) {
                            playTrack(currentTrackIndex + 1);
                        }
                    },
                    onError() {
                        playerElements.playerArtist.textContent = "YouTube không thể phát video này.";
                        playerElements.togglePlayback.disabled = true;
                        reject(new Error("YouTube không thể phát video này."));
                    }
                }
            });
        }));
    }

    return youtubePlayerPromise;
}

function pauseYouTubePlayer() {
    youtubePlayerPromise?.then((player) => player.pauseVideo()).catch(() => {});
}

async function playTrack(index) {
    if (!currentQueue.length) {
        return;
    }

    currentTrackIndex = (index + currentQueue.length) % currentQueue.length;
    const track = currentQueue[currentTrackIndex];
    const videoId = track.videoId || track.youtubeVideoId || track.youtubeId;
    const thisPlaybackRequest = ++playbackRequestNumber;

    playerElements.playerTitle.textContent = track.title || "Bài hát";
    playerElements.addToPlaylist.hidden = false;
    playerElements.playerArtist.textContent =
        track.artists?.join(", ") || currentCollectionArtists.join(", ") || "Nghệ sĩ chưa xác định";
    playerElements.playerCover.src = track.thumbnails?.[0] || "";
    playerElements.previousTrack.disabled = currentQueue.length < 2;
    playerElements.nextTrack.disabled = currentQueue.length < 2;
    playerElements.seekRange.value = "0";

    if (videoId) {
        currentTrackIsYoutube = true;
        currentYoutubeVideoId = videoId;
        playerElements.bar.classList.add("youtube-active");
        document.querySelector("#content")?.classList.add("youtube-active");
        playerElements.togglePlayback.disabled = true;

        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        updatePlaybackButton();
        updateProgress();

        try {
            const player = await getYouTubePlayer();
            if (thisPlaybackRequest !== playbackRequestNumber || currentYoutubeVideoId !== videoId) {
                return;
            }

            player.setVolume(Number(playerElements.volumeRange.value) * 100);
            if (isMuted) {
                player.mute();
            } else {
                player.unMute();
            }
            player.loadVideoById(videoId);
            player.playVideo();
            playerElements.togglePlayback.disabled = false;
        } catch (error) {
            playerElements.playerArtist.textContent = error.message;
            playerElements.togglePlayback.disabled = true;
        }
        return;
    }

    currentTrackIsYoutube = false;
    currentYoutubeVideoId = "";
    playerElements.bar.classList.remove("youtube-active");
    document.querySelector("#content")?.classList.remove("youtube-active");
    pauseYouTubePlayer();

    audio.src = track.audioUrl.trim();
    audio.volume = Number(playerElements.volumeRange.value);
    audio.muted = isMuted;
    audio.load();
    playerElements.togglePlayback.disabled = false;
    updateProgress();

    audio.play().catch(() => {
        playerElements.playerArtist.textContent = "Không thể phát bài hát này.";
        updatePlaybackButton();
    });
}

export async function playCollection(item) {
    const thisRequest = ++requestNumber;
    showPlayer();
    currentTrackIsYoutube = false;
    currentYoutubeVideoId = "";
    playbackRequestNumber++;
    playerElements.bar.classList.remove("youtube-active");
    document.querySelector("#content")?.classList.remove("youtube-active");
    pauseYouTubePlayer();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    currentQueue = [];
    currentTrackIndex = -1;
    updatePlaybackButton();

    playerElements.playerTitle.textContent = item.title || "Đang tải bài hát";
    playerElements.addToPlaylist.hidden = true;
    playerElements.playerArtist.textContent = "Đang tải danh sách phát...";
    playerElements.playerCover.src = item.thumbnails?.[0] || "";
    currentCollectionArtists = item.artists || [];
    playerElements.togglePlayback.disabled = true;
    playerElements.previousTrack.disabled = true;
    playerElements.nextTrack.disabled = true;
    playerElements.currentTime.textContent = "0:00";
    playerElements.trackDuration.textContent = "0:00";
    playerElements.seekRange.value = "0";

    try {
        const tracks = await getTracks(item);
        if (thisRequest !== requestNumber) {
            return;
        }
        if (!tracks.length) {
            throw new Error("Danh sách này chưa có bài hát để phát.");
        }

        currentQueue = tracks;
        const itemType = item.type || "song";
        const selectedTrackIndex = itemType === "song"
            ? currentQueue.findIndex((track) => String(track.id) === String(item.id || item._id))
            : 0;

        playTrack(selectedTrackIndex >= 0 ? selectedTrackIndex : 0);
    } catch (error) {
        if (thisRequest === requestNumber) {
            playerElements.playerArtist.textContent = error.message;
            playerElements.togglePlayback.disabled = true;
            console.error(error);
        }
    }
}

export function getCurrentTrack() {
    if (currentTrackIndex < 0 || !currentQueue[currentTrackIndex]) {
        return null;
    }

    const track = currentQueue[currentTrackIndex];
    return {
        ...track,
        type: track.type || (track.videoId || track.youtubeVideoId || track.youtubeId ? "video" : "song")
    };
}

export function initializeAudioPlayer() {
    const bar = document.querySelector("#audioPlayerBar");
    if (!bar || playerElements) {
        return;
    }

    playerElements = {
        bar,
        playerCover: document.querySelector("#playerCover"),
        playerTitle: document.querySelector("#playerTitle"),
        playerArtist: document.querySelector("#playerArtist"),
        addToPlaylist: document.querySelector("#addToPlaylistButton"),
        closePlayer: document.querySelector("#closePlayer"),
        previousTrack: document.querySelector("#previousTrack"),
        togglePlayback: document.querySelector("#togglePlayback"),
        nextTrack: document.querySelector("#nextTrack"),
        currentTime: document.querySelector("#currentTime"),
        trackDuration: document.querySelector("#trackDuration"),
        seekRange: document.querySelector("#seekRange"),
        toggleMute: document.querySelector("#toggleMute"),
        volumeRange: document.querySelector("#volumeRange")
    };

    audio.volume = Number(playerElements.volumeRange.value);

    playerElements.closePlayer.addEventListener("click", closeAudioPlayer);
    playerElements.addToPlaylist.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("playlist:add-current", { detail: getCurrentTrack() }));
    });

    playerElements.togglePlayback.addEventListener("click", () => {
        if (currentTrackIsYoutube) {
            if (youtubePlayer?.getPlayerState() === window.YT.PlayerState.PLAYING) {
                youtubePlayer.pauseVideo();
            } else {
                youtubePlayer?.playVideo();
            }
            return;
        }

        if (audio.paused) {
            audio.play().catch(() => {
                playerElements.playerArtist.textContent = "Không thể phát bài hát này.";
            });
        } else {
            audio.pause();
        }
    });

    playerElements.previousTrack.addEventListener("click", () => {
        const currentTime = currentTrackIsYoutube
            ? youtubePlayer?.getCurrentTime() || 0
            : audio.currentTime;

        if (currentTime > 3) {
            if (currentTrackIsYoutube) {
                youtubePlayer.seekTo(0, true);
            } else {
                audio.currentTime = 0;
            }
        } else {
            playTrack(currentTrackIndex - 1);
        }
    });

    playerElements.nextTrack.addEventListener("click", () => {
        playTrack(currentTrackIndex + 1);
    });

    playerElements.seekRange.addEventListener("input", () => {
        if (currentTrackIsYoutube && youtubePlayer) {
            const duration = youtubePlayer.getDuration();
            if (Number.isFinite(duration)) {
                youtubePlayer.seekTo((Number(playerElements.seekRange.value) / 100) * duration, true);
            }
        } else if (Number.isFinite(audio.duration)) {
            audio.currentTime = (Number(playerElements.seekRange.value) / 100) * audio.duration;
        }
    });

    playerElements.volumeRange.addEventListener("input", () => {
        const volume = Number(playerElements.volumeRange.value);
        isMuted = volume === 0;
        audio.volume = volume;
        audio.muted = isMuted;

        if (youtubePlayer) {
            youtubePlayer.setVolume(volume * 100);
            isMuted ? youtubePlayer.mute() : youtubePlayer.unMute();
        }

        playerElements.toggleMute.textContent = isMuted ? "×" : "🔊";
        playerElements.toggleMute.setAttribute("aria-label", isMuted ? "Bật tiếng" : "Tắt tiếng");
    });

    playerElements.toggleMute.addEventListener("click", () => {
        isMuted = !isMuted;
        audio.muted = isMuted;

        if (youtubePlayer) {
            isMuted ? youtubePlayer.mute() : youtubePlayer.unMute();
        }

        playerElements.toggleMute.textContent = isMuted ? "×" : "🔊";
        playerElements.toggleMute.setAttribute("aria-label", isMuted ? "Bật tiếng" : "Tắt tiếng");
    });

    audio.addEventListener("play", () => {
        updatePlaybackButton();
        recordCurrentTrack();
    });
    audio.addEventListener("pause", updatePlaybackButton);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("ended", () => playTrack(currentTrackIndex + 1));
    audio.addEventListener("error", () => {
        if (audio.src) {
            playerElements.playerArtist.textContent = "Không tải được audio.";
        }
    });

    window.setInterval(updateProgress, 500);
}
