import { authRequest, getAccessToken } from "./auth.js";

const HISTORY_KEY = "recentlyPlayed";

export function getListeningHistory(limit = 12) {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(history) ? history.slice(0, limit) : [];
    } catch {
        return [];
    }
}

export async function recordPlayedTrack(track) {
    const songId = track?.songId || track?.id || track?._id;
    if (!songId) return;

    const trackId = String(songId);
    const recentTrack = {
        ...track,
        id: trackId,
        type: track.type || (track.videoId || track.youtubeVideoId || track.youtubeId ? "video" : "song"),
        thumbnails: track.thumbnails || (track.thumb ? [track.thumb] : [])
    };

    try {
        const history = getListeningHistory(100);
        const updatedHistory = [
            recentTrack,
            ...history.filter((item) => String(item.id || item._id || item.songId) !== trackId)
        ].slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch {
        // Keep playback working when browser storage is unavailable.
    }

    if (!getAccessToken() || recentTrack.type === "video") return;

    await authRequest("/events/play", {
        method: "POST",
        body: JSON.stringify({ songId })
    });
}
