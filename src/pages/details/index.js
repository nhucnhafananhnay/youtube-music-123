import { makeElement } from "../../utils/dom.js";
import { playCollection } from "../../components/audioPlayer.js";
import { navigateBack, navigateTo } from "../../libs/router.js";
import { fetchMusic } from "../../services/music.js";

const content = document.querySelector("#content");

const typeLabels = {
    album: "Album",
    playlist: "Playlist",
    song: "Bài hát",
    video: "Video"
};

function getItemType(item) {
    if (item.type) {
        return item.type;
    }
    return "song";
}

function getItemId(item) {
    const itemType = getItemType(item);

    if (itemType === "album" || itemType === "playlist") {
        return item.slug || item.id || item._id;
    }

    return item.id || item._id || item.slug;
}

function getDetailPath(item) {
    const itemType = getItemType(item);
    const identifier = getItemId(item);
    let routeType = itemType;

    if (itemType !== "album" && itemType !== "playlist" && itemType !== "song" && itemType !== "video") {
        routeType = "song";
    }

    return `/${routeType}s/details/${encodeURIComponent(identifier)}`;
}

function getArtists(item) {
    if (Array.isArray(item.artists) && item.artists.length > 0) {
        return item.artists.join(", ");
    }
    return item.subtitle || "";
}

async function getDetails(item) {
    const itemType = getItemType(item);
    const identifier = getItemId(item);

    if (!identifier) {
        throw new Error("Không tìm thấy mã của nội dung này.");
    }

    let endpoint = "";
    const encodedIdentifier = encodeURIComponent(identifier);

    if (itemType === "album") {
        endpoint = `/albums/details/${encodedIdentifier}?limit=50`;
    } else if (itemType === "playlist") {
        endpoint = `/playlists/details/${encodedIdentifier}?limit=50`;
    } else if (itemType === "video") {
        endpoint = `/videos/details/${encodedIdentifier}`;
    } else {
        endpoint = `/songs/details/${encodedIdentifier}`;
    }

    let lastError;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetchMusic(endpoint, {
                signal: AbortSignal.timeout(12000)
            });

            if (response.ok) {
                return await response.json();
            }

            lastError = new Error(`Không tải được chi tiết (${response.status}).`);
            if (response.status < 500 && response.status !== 429) {
                break;
            }
        } catch (error) {
            if (error.name === "TimeoutError") {
                lastError = new Error("Tải chi tiết quá lâu. Hãy thử lại.");
            } else {
                lastError = new Error("Không kết nối được máy chủ chi tiết.");
            }
        }

        if (attempt < 2) {
            await new Promise(function (resolve) {
                setTimeout(resolve, 250 * (attempt + 1));
            });
        }
    }

    throw lastError || new Error("Không thể tải chi tiết nội dung này.");
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
}

function getTracks(itemType, data) {
    if (itemType === "album" || itemType === "playlist") {
        return data.tracks || [];
    }

    if (itemType === "song") {
        if (data.album && data.album.tracks && data.album.tracks.length > 0) {
            return data.album.tracks;
        }
        return data.related || [];
    }

    return data.related || [];
}

function formatReleaseDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function makeTrackHeader(showAlbum, showDuration) {
    const header = makeElement("div", "detail-track-header");
    header.classList.toggle("has-album", showAlbum);
    header.classList.toggle("has-duration", showDuration);
    header.appendChild(makeElement("span", "detail-track-number", "#"));
    header.appendChild(makeElement("span", "detail-track-cover-spacer"));
    header.appendChild(makeElement("span", "", "BÀI HÁT"));

    if (showAlbum) {
        header.appendChild(makeElement("span", "", "ALBUM"));
    }
    if (showDuration) {
        header.appendChild(makeElement("span", "", "THỜI GIAN"));
    }

    header.appendChild(makeElement("span", "detail-track-action-spacer"));
    return header;
}

function makeTrackRow(track, index, albumTitle, currentTrackId) {
    const row = makeElement("article", "detail-track");
    const number = makeElement("span", "detail-track-number", String(index + 1));
    const cover = makeElement("img", "detail-track-cover");
    cover.src = track.thumbnails && track.thumbnails[0] ? track.thumbnails[0] : "";
    cover.alt = "";

    const info = makeElement("div", "detail-track-info");
    info.appendChild(makeElement("h3", "", track.title || "Bài hát"));
    const artists = getArtists(track);
    if (artists) {
        info.appendChild(makeElement("p", "", artists));
    }

    let trackAlbumTitle = track.albumName || "";
    if (!trackAlbumTitle && track.album && track.album.title) {
        trackAlbumTitle = track.album.title;
    }
    if (!trackAlbumTitle) {
        trackAlbumTitle = albumTitle;
    }

    const hasDuration = Number.isFinite(track.duration);
    row.classList.toggle("has-album", Boolean(trackAlbumTitle));
    row.classList.toggle("has-duration", hasDuration);

    let durationText = "";
    if (hasDuration) {
        durationText = formatDuration(track.duration);
    }
    const album = makeElement("span", "detail-track-album", trackAlbumTitle);
    const duration = makeElement("span", "detail-track-duration", durationText);

    const playButton = makeElement("button", "detail-track-play", "▶");
    playButton.type = "button";
    playButton.setAttribute("aria-label", `Phát ${track.title || "bài hát"}`);
    playButton.addEventListener("click", function (event) {
        event.stopPropagation();
        let type = "song";
        if (track.videoId) {
            type = "video";
        }
        playCollection({ ...track, type: type });
    });

    const openTrack = function () {
        let type = "song";
        if (track.videoId) {
            type = "video";
        }
        showDetails({ ...track, type: type });
    };
    cover.addEventListener("click", openTrack);
    info.addEventListener("click", openTrack);

    row.appendChild(number);
    row.appendChild(cover);
    row.appendChild(info);
    if (trackAlbumTitle) {
        row.appendChild(album);
    }
    if (hasDuration) {
        row.appendChild(duration);
    }
    row.appendChild(playButton);

    if (track.id === currentTrackId) {
        row.classList.add("current-track");
    }

    return row;
}

function renderDetails(item, data) {
    const itemType = getItemType(item);
    const detail = makeElement("section", "detail-page");
    const toolbar = makeElement("div", "detail-toolbar");
    const backButton = makeElement("button", "detail-back", "‹ Quay lại");
    backButton.type = "button";
    backButton.addEventListener("click", function () {
        navigateBack();
    });
    toolbar.appendChild(backButton);

    const layout = makeElement("div", `detail-layout detail-layout-${itemType}`);
    const summary = makeElement("aside", "detail-summary");
    const cover = makeElement("img", "detail-hero-cover");
    let coverUrl = "";
    if (data.thumbnails && data.thumbnails[0]) {
        coverUrl = data.thumbnails[0];
    } else if (item.thumbnails && item.thumbnails[0]) {
        coverUrl = item.thumbnails[0];
    }
    cover.src = coverUrl;
    cover.alt = data.title || item.title || "";

    const info = makeElement("div", "detail-summary-info");
    info.appendChild(makeElement("p", "detail-eyebrow", typeLabels[itemType] || "Nội dung"));
    info.appendChild(makeElement("h1", "", data.title || item.title || "Chi tiết"));

    const artists = getArtists(data);
    if (artists) {
        info.appendChild(makeElement("p", "detail-artists", artists));
    }

    const metadata = [];
    if (itemType === "album" || itemType === "playlist") {
        let songCount = 0;
        if (Number.isFinite(data.songCount)) {
            songCount = data.songCount;
        } else if (data.tracks) {
            songCount = data.tracks.length;
        }
        metadata.push(`${songCount} bài hát`);
    }
    if (data.releaseDate) {
        metadata.push(`Phát hành ${formatReleaseDate(data.releaseDate)}`);
    }
    if (Number.isFinite(data.duration)) {
        metadata.push(formatDuration(data.duration));
    }
    if (Number.isFinite(data.popularity)) {
        metadata.push(`Độ phổ biến ${data.popularity.toLocaleString("vi-VN")}`);
    }
    if (metadata.length > 0) {
        info.appendChild(makeElement("p", "detail-metadata", metadata.join(" · ")));
    }
    if (data.description) {
        info.appendChild(makeElement("p", "detail-description", data.description));
    }

    const playAll = makeElement("button", "detail-play-all", "▶ Phát tất cả");
    playAll.type = "button";
    playAll.addEventListener("click", function () {
        playCollection({ ...data, type: itemType });
    });
    info.appendChild(playAll);
    summary.appendChild(cover);
    summary.appendChild(info);
    detail.appendChild(toolbar);
    detail.appendChild(layout);

    const main = makeElement("div", "detail-main");
    if (data.description) {
        main.appendChild(makeElement("p", "detail-description", data.description));
    }

    const tracks = getTracks(itemType, data);
    if (tracks.length > 0) {
        const listSection = makeElement("section", "detail-track-section");
        let listTitle = "Danh sách bài hát";
        if (itemType === "song") {
            listTitle = "Các bài trong album";
        }
        listSection.appendChild(makeElement("h2", "", listTitle));

        let albumTitle = "";
        if (itemType === "album" || itemType === "playlist") {
            albumTitle = data.title || "";
        } else if (data.album && data.album.album && data.album.album.title) {
            albumTitle = data.album.album.title;
        } else if (data.album && data.album.title) {
            albumTitle = data.album.title;
        }

        let showAlbum = Boolean(albumTitle);
        let showDuration = false;
        for (const track of tracks) {
            if (track.albumName || (track.album && track.album.title)) {
                showAlbum = true;
            }
            if (Number.isFinite(track.duration)) {
                showDuration = true;
            }
        }
        listSection.appendChild(makeTrackHeader(showAlbum, showDuration));

        const trackList = makeElement("div", "detail-track-list");
        let currentTrackId = null;
        if (itemType === "song") {
            currentTrackId = data.id;
        }

        for (let index = 0; index < tracks.length; index++) {
            const row = makeTrackRow(tracks[index], index, albumTitle, currentTrackId);
            trackList.appendChild(row);
        }
        listSection.appendChild(trackList);
        main.appendChild(listSection);
    }

    const relatedAlbum = data.album && data.album.album;
    if (relatedAlbum && relatedAlbum.title) {
        const albumLink = makeElement("button", "detail-related-album", relatedAlbum.title);
        albumLink.type = "button";
        albumLink.addEventListener("click", function () {
            showDetails({ ...relatedAlbum, type: "album" });
        });
        summary.appendChild(albumLink);
    }

    layout.appendChild(summary);
    layout.appendChild(main);
    return detail;
}

export async function showDetails(item, options = {}) {
    if (!content) {
        return;
    }

    if (options.navigate !== false) {
        navigateTo(getDetailPath(item));
        return;
    }

    const loading = makeElement("p", "detail-loading", "Đang tải chi tiết...");
    content.replaceChildren(loading);
    content.scrollTop = 0;

    try {
        const data = await getDetails(item);
        if (!content.contains(loading)) {
            return;
        }

        const detail = renderDetails(item, data);
        content.replaceChildren(detail);
        content.scrollTop = 0;
    } catch (error) {
        const message = makeElement("p", "detail-error", error.message);
        const backButton = makeElement("button", "detail-back", "‹ Quay lại");
        backButton.type = "button";
        backButton.addEventListener("click", function () {
            navigateBack();
        });
        content.replaceChildren(backButton, message);
    }
}
