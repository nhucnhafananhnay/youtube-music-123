import view from "./view.html?raw";
import { getMusicData } from "../../services/music.js";
import { playCollection } from "../../components/audioPlayer.js";
import { showDetails } from "../details/index.js";
import { navigateTo } from "../../libs/router.js";
import { getListeningHistory } from "../../services/history.js";



async function getData(endpoint) {
    return getMusicData(endpoint);
}

function addDetailClick(card, item) {
    const imageContainer = card.querySelector(".image-container");
    imageContainer.addEventListener("click", (event) => {
        if (event.target.closest(".play-button")) {
            return;
        }
        showDetails(item);
    });
    imageContainer.setAttribute("role", "link");
    imageContainer.setAttribute("tabindex", "0");
    imageContainer.setAttribute("aria-label", `Xem chi tiết ${item.title || "nội dung"}`);
    imageContainer.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showDetails(item);
        }
    });
}

function renderAlbums(albums) {
    const albumList = document.querySelector("#albumList");
    if (!albumList) return;

    albumList.innerHTML = "";

    albums.forEach((album) => {
        const card = document.createElement("div");
        card.className = "music-card";
        card.innerHTML = `
            <div class="image-container">
                <img src="${album.thumbnails?.[0] ?? ""}" alt="${album.title}">
                <button class="play-button" type="button" aria-label="Phát">▶</button>
            </div>
            <h3>${album.title}</h3>
            <p>${album.artists?.join(", ") ?? "Various Artists"}</p>
        `;
        addDetailClick(card, album);
        card.querySelector(".play-button").addEventListener("click", () => {
            playCollection(album);
        });
        albumList.appendChild(card);
    });
}

function renderMusicList(items, selector) {
    const musicList = document.querySelector(selector);
    if (!musicList) return;

    musicList.innerHTML = "";

    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "music-card";
        card.innerHTML = `
            <div class="image-container">
                <img src="${item.thumbnails?.[0] ?? ""}" alt="${item.title}">
                <button class="play-button" type="button" aria-label="Phát">▶</button>
            </div>
            <h3>${item.title}</h3>
            <p>${item.artists?.join(", ") ?? ""}</p>
        `;
        addDetailClick(card, item);
        card.querySelector(".play-button").addEventListener("click", () => {
            playCollection(item);
        });
        musicList.appendChild(card);
    });
}

function renderTodaysHits(items) {
    const todayList = document.querySelector("#todayList");
    if (!todayList) return;

    todayList.innerHTML = "";

    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "music-card";
        card.innerHTML = `
            <div class="image-container">
                <img src="${item.thumbnails?.[0] ?? ""}" alt="${item.title}">
                <button class="play-button" type="button" aria-label="Phát">▶</button>
            </div>
            <h3>${item.title}</h3>
            <p>${item.artists?.join(", ") ?? ""}</p>
        `;
        addDetailClick(card, item);
        card.querySelector(".play-button").addEventListener("click", () => {
            playCollection(item);
        });
        todayList.appendChild(card);
    });
}

function renderMoods(items) {
    const moodList = document.querySelector("#moodList");
    if (!moodList) return;

    moodList.innerHTML = "";

    items.forEach((mood) => {
        const button = document.createElement("button");
        button.textContent = mood.name;
        button.addEventListener("click", () => {
            navigateTo(`/moods/${encodeURIComponent(mood.slug)}`);
        });
        moodList.appendChild(button);
    });
}

function renderWelcome() {
    const welcomeTitle = document.querySelector("#welcomeTitle");
    if (!welcomeTitle) return;

    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const name = user?.name || user?.username || "bạn";
        welcomeTitle.textContent = `👋 Chào mừng ${name}`;
    } catch (error) {
        welcomeTitle.textContent = "👋 Chào mừng bạn";
    }
}

async function getAlbums() {
    const data = await getData("/home/albums-for-you?limit=12");
    renderAlbums(data);
}

async function getTodaysHits() {
    const data = await getData("/home/todays-hits?country=GLOBAL&limit=12");
    renderTodaysHits(data);
}

async function getQuickPicks(mood = "relax") {
    const data = await getData(`/quick-picks?mood=${mood}&country=GLOBAL&limit=12`);
    renderMusicList(data, "#quickPickList");
}

async function getRecentlyPlayed() {
    const items = await getListeningHistory(12);
    const list = document.querySelector("#quickPickList");
    if (!items.length && list) {
        list.innerHTML = '<p class="recent-empty">Chưa có nội dung đã nghe gần đây.</p>';
        return;
    }
    renderMusicList(items, "#quickPickList");
}

async function getMoods() {
    const data = await getData("/moods?limit=20");
    renderMoods(data.items);
}

async function getVietnamMusic() {
    const data = await getData("/playlists/by-country?country=VN&limit=12");
    renderMusicList(data, "#vietnamList");
}

function setupScrollControls() {
    document.querySelectorAll(".music-section").forEach((section) => {
        const list = section.querySelector(".music-list");
        const thumb = section.querySelector(".scroll-thumb");

        if (!list || !thumb) return;

        const handleScroll = () => {
            const scrollWidth = list.scrollWidth;
            const clientWidth = list.clientWidth;
            const maxScroll = scrollWidth - clientWidth;

            if (maxScroll <= 0) {
                thumb.style.width = "100%";
                thumb.style.left = "0";
                return;
            }

            const thumbWidth = (clientWidth / scrollWidth) * 100;
            const scrollPercent = list.scrollLeft / maxScroll;
            const maxThumbPosition = 100 - thumbWidth;
            const thumbPosition = scrollPercent * maxThumbPosition;

            thumb.style.width = `${thumbWidth}%`;
            thumb.style.left = `${thumbPosition}%`;
        };

        list.addEventListener("scroll", handleScroll);
        handleScroll();

        section.querySelector(".next-btn")?.addEventListener("click", () => {
            list.scrollBy({ left: 220, behavior: "smooth" });
        });

        section.querySelector(".prev-btn")?.addEventListener("click", () => {
            list.scrollBy({ left: -220, behavior: "smooth" });
        });
    });
}

export function initHome(moodSlug = "relax") {
    renderWelcome();
    getAlbums().catch(console.error);
    getTodaysHits().catch(console.error);
    if (window.location.pathname.startsWith("/moods/")) {
        document.querySelector(".music-section h2")?.replaceChildren("Gợi ý theo tâm trạng");
        getQuickPicks(moodSlug).catch(console.error);
    } else {
        getRecentlyPlayed().catch(console.error);
    }
    getMoods().catch(console.error);
    getVietnamMusic().catch(console.error);
    setupScrollControls();
}

export async function renderPage(container, options = {}) {
    container.innerHTML = view;
    return initHome(options.moodSlug);
}
