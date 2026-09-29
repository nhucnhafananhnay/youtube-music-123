import view from "./view.html?raw";
import { getMusicData } from "../../services/music.js";
import { navigateTo } from "../../libs/router.js";
import { playCollection } from "../../components/audioPlayer.js";
import { showDetails } from "../details/index.js";



async function getData(endpoint) {
    return getMusicData(endpoint);
}


function getItems(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    return [];
}


function getThumbnail(item) {
    return (
        item.thumbnails?.[0] ||
        item.thumbnailUrl ||
        item.thumb ||
        ""
    );
}


function getTitle(item) {
    return item.title || item.name || "Không có tên";
}


function getArtists(item) {
    if (Array.isArray(item.artists)) {
        return item.artists.join(", ");
    }

    return "";
}


function createMediaImage(item, type) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "explore-media-image";
    imageContainer.setAttribute("role", "link");
    imageContainer.setAttribute("tabindex", "0");
    imageContainer.setAttribute("aria-label", `Xem chi tiết ${getTitle(item)}`);

    const image = document.createElement("img");
    image.src = getThumbnail(item);
    image.alt = getTitle(item);

    const playButton = document.createElement("button");
    playButton.className = "explore-play-button";
    playButton.type = "button";
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", `Phát ${getTitle(item)}`);
    playButton.addEventListener("click", (event) => {
        event.stopPropagation();
        playCollection({ ...item, type });
    });

    const openDetails = () => showDetails({ ...item, type });
    imageContainer.addEventListener("click", (event) => {
        if (!event.target.closest(".explore-play-button")) {
            openDetails();
        }
    });
    imageContainer.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetails();
        }
    });

    imageContainer.append(image, playButton);
    return imageContainer;
}


/* ALBUM*/

function renderAlbums(items) {
    const list = document.querySelector("#albumExploreList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((album) => {
        const card = document.createElement("div");

        card.className = "explore-card";

        card.appendChild(createMediaImage(album, "album"));
        card.insertAdjacentHTML("beforeend", `
            <h3>${getTitle(album)}</h3>

            <p>
                ${album.type || "Album"}
            </p>
        `);

        list.appendChild(card);
    });
}


/* VIDEO*/

function renderVideos(items) {
    const list = document.querySelector("#videoList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((video) => {
        const card = document.createElement("div");

        card.className = "explore-video-card";

        card.appendChild(createMediaImage(video, "video"));
        card.insertAdjacentHTML("beforeend", `
            <h3>${getTitle(video)}</h3>

            <p>
                ${video.views ?? 0} lượt xem
            </p>
        `);

        list.appendChild(card);
    });
}


/* NEW RELEASE*/

function renderNewReleases(items) {
    const list = document.querySelector("#newReleaseList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((item) => {
        const card = document.createElement("div");

        card.className = "explore-card";

        const releaseType = item.type || (item.albumType ? "album" : "song");
        card.appendChild(createMediaImage(item, releaseType));
        card.insertAdjacentHTML("beforeend", `
            <h3>${getTitle(item)}</h3>

            <p>
                ${getArtists(item)}
            </p>
        `);

        list.appendChild(card);
    });
}


/* CATEGORY*/

async function getExploreMeta() {
    return getData("/explore/meta");
}


function renderCategories(items) {
    const list = document.querySelector("#categoryList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((category) => {
        const card = document.createElement("button");

        card.className = "category-card";

        card.style.setProperty(
            "--category-color",
            category.color || "#444"
        );

        card.innerHTML = `
            <span></span>
            <strong>${category.name}</strong>
        `;

        card.addEventListener("click", () => {
            navigateTo(`/categories/${category.slug}`);
        });

        list.appendChild(card);
    });
}


/* LINE*/

function renderLines(items) {
    const list = document.querySelector("#lineList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((line) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "category-card";
        card.style.setProperty("--category-color", line.color || "#444");
        card.innerHTML = `
            <span></span>
            <strong>${line.name}</strong>
        `;

        card.addEventListener("click", () => {
            navigateTo(`/lines/${line.slug}`);
        });

        list.appendChild(card);
    });
}


/*CHART*/

async function getVideoCharts() {
    const data = await getData(
        "/charts/videos?country=GLOBAL&period=latest&limit=20&sort=-views"
    );

    return getItems(data);
}


async function getArtistCharts() {
    const data = await getData(
        "/charts/top-artists?country=GLOBAL&period=latest&limit=20"
    );

    return getItems(data);
}


function renderCharts(items, chartType = "video") {
    const list = document.querySelector("#chartList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    items.forEach((item, index) => {
        const row = document.createElement("div");

        row.className = "chart-row";

        row.innerHTML = `
            <span class="chart-number">
                ${index + 1}
            </span>

            <img
                src="${getThumbnail(item)}"
                alt="${getTitle(item)}"
            >

            <div class="chart-info">
                <h3>
                    ${getTitle(item)}
                </h3>

                <p>
                    ${getArtists(item)}
                </p>
            </div>

            <span class="chart-value">
                ${item.views ?? item.popularity ?? ""}
            </span>
        `;

        if (chartType === "video") {
            row.tabIndex = 0;
            row.setAttribute("role", "link");
            row.setAttribute("aria-label", `Xem chi tiết ${getTitle(item)}`);
            row.addEventListener("click", (event) => {
                if (!event.target.closest(".chart-play-button")) {
                    showDetails({ ...item, type: "video" });
                }
            });
            row.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showDetails({ ...item, type: "video" });
                }
            });

            const playButton = document.createElement("button");
            playButton.className = "chart-play-button";
            playButton.type = "button";
            playButton.textContent = "▶";
            playButton.setAttribute("aria-label", `Phát ${getTitle(item)}`);
            playButton.addEventListener("click", (event) => {
                event.stopPropagation();
                playCollection({ ...item, type: "video" });
            });
            row.appendChild(playButton);
        }

        list.appendChild(row);
    });
}


/* SCROLL*/

function initExploreScroll() {
    document
        .querySelectorAll(".explore-section")
        .forEach((section) => {

            const list =
                section.querySelector(".explore-horizontal");

            if (!list) {
                return;
            }

            const prev =
                section.querySelector(".explore-prev");

            const next =
                section.querySelector(".explore-next");


            next?.addEventListener("click", () => {
                list.scrollBy({
                    left: 700,
                    behavior: "smooth"
                });
            });


            prev?.addEventListener("click", () => {
                list.scrollBy({
                    left: -700,
                    behavior: "smooth"
                });
            });
        });
}


/*SHORTCUT*/

function initExploreShortcuts() {
    document
        .querySelectorAll(".explore-shortcut")
        .forEach((button) => {

            button.addEventListener("click", () => {

                const target =
                    document.querySelector(
                        `#${button.dataset.target}`
                    );

                target?.scrollIntoView({
                    behavior: "smooth"
                });

            });
        });
}


/* CHART TABS*/

function initChartTabs() {
    const tabs =
        document.querySelectorAll(".chart-tab");

    tabs.forEach((tab) => {

        tab.addEventListener("click", async () => {

            tabs.forEach((item) => {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            try {
                let data;

                if (tab.dataset.chart === "videos") {
                    data = await getVideoCharts();
                } else {
                    data = await getArtistCharts();
                }

                renderCharts(data, tab.dataset.chart === "videos" ? "video" : "artist");

            } catch (error) {
                console.error(error);
            }
        });
    });
}


/* INIT*/

export async function initExplore() {
    try {
        const albums = await getData("/explore/albums?limit=10");
        const videos = await getData("/explore/videos?limit=10");
        const newReleases = await getData("/explore/new-releases?limit=20&sort=-releaseDate");
        const exploreMeta = await getExploreMeta();
        const charts = await getVideoCharts();

        renderAlbums(getItems(albums));
        renderVideos(getItems(videos));
        renderNewReleases(getItems(newReleases));
        renderCategories(getItems(exploreMeta.categories));
        renderLines(getItems(exploreMeta.lines));
        renderCharts(charts);

        initExploreScroll();
        initExploreShortcuts();
        initChartTabs();
    } catch (error) {
        console.error("Explore:", error);
    }
}

export async function renderPage(container, options = {}) {
    container.innerHTML = view;
    return initExplore();
}
