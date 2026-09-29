import view from "./view.html?raw";
import { getMusicData } from "../../services/music.js";
import { navigateTo } from "../../libs/router.js";
import { showDetails } from "../details/index.js";

async function getData(endpoint) {
    return getMusicData(endpoint);
}

function getSlug() {
    const pathParts = window.location.pathname.split("/");
    return decodeURIComponent(pathParts[2] || "");
}

function renderCategory(data) {
    const title = document.querySelector("#categoryTitle");
    const description = document.querySelector("#categoryDescription");
    const list = document.querySelector("#subcategoryList");

    title.textContent = data.name || "Danh mục";
    description.textContent = data.description || "";
    list.innerHTML = "";

    const subcategories = data.subcategories || [];

    for (const subcategory of subcategories) {
        const section = document.createElement("section");
        section.className = "subcategory-section";
        section.innerHTML = `
            <div class="detail-section-header">
                <div>
                    <h2>${subcategory.name}</h2>
                    <p>${subcategory.popularity ?? ""}</p>
                </div>
                <div class="detail-arrows">
                    <button class="detail-prev">‹</button>
                    <button class="detail-next">›</button>
                </div>
            </div>
            <div class="detail-horizontal"></div>
        `;

        const playlistList = section.querySelector(".detail-horizontal");
        const playlists = subcategory.playlists || [];

        for (const playlist of playlists) {
            const card = document.createElement("div");
            card.className = "detail-card";
            card.innerHTML = `
                <img src="${playlist.thumbnails?.[0] || ""}" alt="${playlist.title || ""}">
                <h3>${playlist.title || ""}</h3>
                <p>${playlist.description || ""}</p>
            `;

            if (playlist.slug) {
                card.classList.add("is-clickable");
                card.setAttribute("role", "link");
                card.setAttribute("tabindex", "0");
                card.setAttribute("aria-label", `Xem playlist ${playlist.title || ""}`);

                const openPlaylist = function () {
                    showDetails({ ...playlist, type: "playlist" });
                };

                card.addEventListener("click", openPlaylist);
                card.addEventListener("keydown", function (event) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPlaylist();
                    }
                });
            }

            playlistList.appendChild(card);
        }

        const nextButton = section.querySelector(".detail-next");
        const previousButton = section.querySelector(".detail-prev");

        nextButton.addEventListener("click", function () {
            playlistList.scrollBy({ left: 500, behavior: "smooth" });
        });
        previousButton.addEventListener("click", function () {
            playlistList.scrollBy({ left: -500, behavior: "smooth" });
        });

        list.appendChild(section);
    }
}

export async function initCategory() {
    const slug = getSlug();

    if (!slug) {
        return;
    }

    try {
        const endpoint = `/categories/${encodeURIComponent(slug)}?subLimit=20&playlistLimit=10`;
        const data = await getData(endpoint);
        renderCategory(data);
    } catch (error) {
        console.error(error);
        document.querySelector("#categoryTitle").textContent = "Không thể tải danh mục";
    }

    const backButton = document.querySelector("#categoryBack");
    backButton.addEventListener("click", function () {
        navigateTo("/explore");
    });
}

export async function renderPage(container) {
    container.innerHTML = view;
    return initCategory();
}
