import view from "./view.html?raw";
import { getMusicData } from "../../services/music.js";
import { navigateTo } from "../../libs/router.js";
import { showDetails } from "../details/index.js";

async function getData(endpoint) {
    return getMusicData(endpoint);
}

async function getDataOrNull(endpoint) {
    try {
        return await getData(endpoint);
    } catch (error) {
        console.error("Line API:", error);
        return null;
    }
}

function getSlug() {
    const pathParts = window.location.pathname.split("/");
    return decodeURIComponent(pathParts[2] || "");
}

function getItems(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && Array.isArray(data.items)) {
        return data.items;
    }
    return [];
}

function getImage(item) {
    if (item.thumbnails && item.thumbnails[0]) {
        return item.thumbnails[0];
    }
    return item.thumbnailUrl || item.thumb || "";
}

function getName(item) {
    return item.title || item.name || "Không có tên";
}

function renderList(selector, items, type) {
    const list = document.querySelector(selector);
    if (!list) {
        return;
    }

    list.innerHTML = "";
    list.closest(".line-section").hidden = items.length === 0;

    for (const item of items) {
        const card = document.createElement("div");
        card.className = "detail-card";

        let cardDescription = "";
        if (item.artists && item.artists.length) {
            cardDescription = item.artists.join(", ");
        } else if (item.albumName) {
            cardDescription = item.albumName;
        } else if (item.views !== undefined) {
            cardDescription = `${item.views} lượt xem`;
        }

        card.innerHTML = `
            <img src="${getImage(item)}" alt="${getName(item)}">
            <h3>${getName(item)}</h3>
            <p>${cardDescription}</p>
        `;

        const identifier = item.slug || item.id || item._id;
        if (identifier) {
            card.classList.add("is-clickable");
            card.setAttribute("role", "link");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", `Xem chi tiết ${getName(item)}`);

            const openDetails = function () {
                const detailsItem = {
                    ...item,
                    title: getName(item),
                    thumbnails: item.thumbnails || [getImage(item)],
                    type: type
                };
                showDetails(detailsItem);
            };

            card.addEventListener("click", openDetails);
            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDetails();
                }
            });
        }

        list.appendChild(card);
    }
}

function initLineScroll() {
    const sections = document.querySelectorAll(".line-section");

    for (const section of sections) {
        const list = section.querySelector(".detail-horizontal");
        const previousButton = section.querySelector(".line-prev");
        const nextButton = section.querySelector(".line-next");

        if (!list || !previousButton || !nextButton) {
            continue;
        }

        nextButton.addEventListener("click", function () {
            list.scrollBy({ left: 500, behavior: "smooth" });
        });
        previousButton.addEventListener("click", function () {
            list.scrollBy({ left: -500, behavior: "smooth" });
        });
    }
}

export async function initLine() {
    const slug = getSlug();
    if (!slug) {
        return;
    }

    const encodedSlug = encodeURIComponent(slug);
    const line = await getDataOrNull(`/lines/${encodedSlug}`);
    const songs = await getDataOrNull(`/lines/${encodedSlug}/songs?limit=20&sort=-popularity`);
    const playlists = await getDataOrNull(`/lines/${encodedSlug}/playlists?limit=20&sort=-popularity`);
    const albums = await getDataOrNull(`/lines/${encodedSlug}/albums?limit=20&sort=-popularity`);
    const videos = await getDataOrNull(`/lines/${encodedSlug}/videos?limit=20&sort=-popularity`);

    const title = document.querySelector("#lineTitle");
    const description = document.querySelector("#lineDescription");
    title.textContent = line?.name || "Không thể tải dòng nhạc";
    description.textContent = line?.description || "";

    renderList("#lineSongs", getItems(songs), "song");
    renderList("#linePlaylists", getItems(playlists), "playlist");
    renderList("#lineAlbums", getItems(albums), "album");
    renderList("#lineVideos", getItems(videos), "video");
    initLineScroll();

    const backButton = document.querySelector("#lineBack");
    backButton.addEventListener("click", function () {
        navigateTo("/explore");
    });
}

export async function renderPage(container) {
    container.innerHTML = view;
    return initLine();
}
