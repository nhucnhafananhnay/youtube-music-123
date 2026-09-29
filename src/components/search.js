import { fetchMusic } from "../services/music.js";
import { playCollection } from "./audioPlayer.js";
import { showDetails } from "../pages/details/index.js";
import { navigateTo } from "../libs/router.js";
import { makeElement } from "../utils/dom.js";

const RESULTS_PER_PAGE = 20;
const API_RESULTS_LIMIT = 500;
const input = document.querySelector("#searchInput");
const submitButton = document.querySelector("#searchSubmit");
const panel = document.querySelector("#searchPanel");
const content = document.querySelector("#content");
const searchBox = document.querySelector(".search-box");

let debounceTimer;
let suggestionRequest = 0;
let resultRequest = 0;
let currentQuery = "";
let currentPage = 1;
let currentResultsData = null;
let currentResultsQuery = "";
let currentTypeFilter = "all";

const typeLabels = {
    album: "Album",
    playlist: "Playlist",
    song: "Bài hát",
    video: "Video"
};

async function getJson(endpoint) {
    let response;
    try {
        response = await fetchMusic(endpoint, {
            signal: AbortSignal.timeout(18000)
        });
    } catch (error) {
        if (error.name === "TimeoutError") {
            throw new Error("Máy chủ tìm kiếm phản hồi quá lâu. Hãy thử lại.");
        }
        throw new Error("Không kết nối được máy chủ tìm kiếm.");
    }

    if (!response.ok) {
        throw new Error(`Tìm kiếm tạm thời gặp lỗi (${response.status}). Hãy thử lại.`);
    }
    return response.json();
}

function closeSuggestions() {
    suggestionRequest++;
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
}

function openSuggestions() {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
}

function addSuggestionButton(label, subtitle, thumbnail, onSelect) {
    const button = makeElement("button", "search-suggestion");
    button.type = "button";
    button.setAttribute("role", "option");

    if (thumbnail) {
        const image = makeElement("img", "search-suggestion-image");
        image.src = thumbnail;
        image.alt = "";
        button.appendChild(image);
    } else {
        button.appendChild(makeElement("span", "search-suggestion-icon", "⌕"));
    }

    const text = makeElement("span", "search-suggestion-text");
    text.appendChild(makeElement("span", "search-suggestion-title", label));
    if (subtitle) {
        text.appendChild(makeElement("span", "search-suggestion-subtitle", subtitle));
    }
    button.appendChild(text);
    button.addEventListener("click", onSelect);
    panel.appendChild(button);
}

function renderSuggestions(data, query) {
    panel.replaceChildren();

    let completed = data.completed;
    let suggestions = data.suggestions;

    if (!Array.isArray(completed)) {
        completed = [];
    }
    if (!Array.isArray(suggestions)) {
        suggestions = [];
    }

    if (completed.length) {
        panel.appendChild(makeElement("p", "search-panel-heading", "Kết quả phù hợp"));
        for (const item of completed) {
            addSuggestionButton(
                item.title,
                item.subtitle || typeLabels[item.type] || "",
                item.thumbnails?.[0],
                () => runSearch(item.title || query)
            );
        }
    }

    const matchingSuggestions = [];
    for (const suggestion of suggestions) {
        let alreadyCompleted = false;

        for (const item of completed) {
            if (item.title === suggestion) {
                alreadyCompleted = true;
                break;
            }
        }

        if (!alreadyCompleted) {
            matchingSuggestions.push(suggestion);
        }
    }

    if (matchingSuggestions.length) {
        panel.appendChild(makeElement("p", "search-panel-heading", "Gợi ý"));
        for (const suggestion of matchingSuggestions) {
            addSuggestionButton(suggestion, "", "", () => runSearch(suggestion));
        }
    }

    if (!completed.length && !matchingSuggestions.length) {
        panel.appendChild(makeElement("p", "search-empty", "Không có gợi ý phù hợp."));
    }

    openSuggestions();
}

async function loadSuggestions(query) {
    const requestId = ++suggestionRequest;
    const params = new URLSearchParams({ q: query });

    try {
        const data = await getJson(`/search/suggestions?${params}`);
        if (requestId === suggestionRequest && input.value.trim() === query) {
            renderSuggestions(data, query);
        }
    } catch (error) {
        if (requestId === suggestionRequest) {
            panel.replaceChildren(makeElement("p", "search-empty", error.message));
            openSuggestions();
        }
    }
}

function createSearchResult(item) {
    const result = makeElement("article", "search-result");

    const imageButton = makeElement("button", "search-result-image-button");
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `Xem chi tiết ${item.title || "kết quả"}`);
    const image = makeElement("img", "search-result-image");
    image.src = item.thumbnails?.[0] || "";
    image.alt = "";
    imageButton.appendChild(image);
    imageButton.addEventListener("click", () => showDetails(item));

    const details = makeElement("button", "search-result-details");
    details.type = "button";
    details.setAttribute("aria-label", `Xem chi tiết ${item.title || "kết quả"}`);
    details.appendChild(makeElement("span", "search-result-title", item.title || "Không có tiêu đề"));
    details.appendChild(makeElement("span", "search-result-subtitle", item.subtitle || ""));
    details.addEventListener("click", () => showDetails(item));

    const type = makeElement("span", "search-result-type", typeLabels[item.type] || "Nội dung");
    const playButton = makeElement("button", "search-result-play-icon", "▶");
    playButton.type = "button";
    playButton.setAttribute("aria-label", `Phát ${item.title || "kết quả"}`);
    playButton.addEventListener("click", () => playCollection(item));

    result.append(imageButton, details, type, playButton);

    return result;
}

function interleaveResultsByType(items) {
    const buckets = {};

    for (const item of items) {
        const type = item.type || "other";
        if (!buckets[type]) {
            buckets[type] = [];
        }
        buckets[type].push(item);
    }

    const typeOrder = ["song", "album", "playlist", "video"];
    const availableTypes = Object.keys(buckets);
    for (const type of availableTypes) {
        if (!typeOrder.includes(type)) {
            typeOrder.push(type);
        }
    }

    const orderedTypes = [];
    for (const type of typeOrder) {
        if (buckets[type]) {
            orderedTypes.push(type);
        }
    }

    const results = [];
    let index = 0;
    let hasMoreItems = true;

    while (hasMoreItems) {
        hasMoreItems = false;

        for (const type of orderedTypes) {
            const item = buckets[type][index];
            if (item) {
                results.push(item);
                hasMoreItems = true;
            }
        }
        index++;
    }

    return results;
}

function renderResults(data, query, page, typeFilter = currentTypeFilter) {
    content.replaceChildren();

    const section = makeElement("section", "search-page");
    const heading = makeElement("div", "search-page-heading");
    const titleGroup = makeElement("div", "search-page-title-group");
    titleGroup.appendChild(makeElement("h1", "", "Kết quả tìm kiếm"));
    const allResults = Array.isArray(data.results) ? data.results : [];
    titleGroup.appendChild(makeElement("p", "", `“${query}” · ${allResults.length} kết quả`));
    heading.appendChild(titleGroup);

    const availableTypes = [];
    for (const item of allResults) {
        if (item.type && !availableTypes.includes(item.type)) {
            availableTypes.push(item.type);
        }
    }

    const orderedTypes = [];
    const commonTypes = ["song", "album", "playlist", "video"];
    for (const type of commonTypes) {
        if (availableTypes.includes(type)) {
            orderedTypes.push(type);
        }
    }

    const filters = [
        { type: "all", label: "Tất cả", count: allResults.length },
    ];

    for (const type of orderedTypes) {
        let count = 0;
        for (const item of allResults) {
            if (item.type === type) {
                count++;
            }
        }
        filters.push({
            type,
            label: typeLabels[type] || "Nội dung",
            count
        });
    }

    const filterBar = makeElement("nav", "search-type-filters");
    filterBar.setAttribute("aria-label", "Lọc loại kết quả");
    filters.forEach((filter) => {
        const button = makeElement("button", "search-type-filter", `${filter.label} ${filter.count}`);
        button.type = "button";
        button.classList.toggle("active", filter.type === typeFilter);
        button.setAttribute("aria-pressed", String(filter.type === typeFilter));
        button.addEventListener("click", () => {
            currentTypeFilter = filter.type;
            runSearch(query, 1);
        });
        filterBar.appendChild(button);
    });

    let filteredResults = [];
    if (typeFilter === "all") {
        filteredResults = interleaveResultsByType(allResults);
    } else {
        for (const item of allResults) {
            if (item.type === typeFilter) {
                filteredResults.push(item);
            }
        }
    }
    const startIndex = (page - 1) * RESULTS_PER_PAGE;
    const results = filteredResults.slice(startIndex, startIndex + RESULTS_PER_PAGE);
    const list = makeElement("div", "search-results-list");

    if (results.length) {
        results.forEach((item) => list.appendChild(createSearchResult(item)));
    } else {
        const label = typeLabels[typeFilter] || "kết quả";
        list.appendChild(makeElement("p", "search-no-results", `Không tìm thấy ${label.toLowerCase()} cho “${query}”.`));
    }

    section.append(heading, filterBar, list);

    const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
    if (totalPages > 1) {
        const pagination = makeElement("nav", "search-pagination");
        pagination.setAttribute("aria-label", "Phân trang kết quả tìm kiếm");

        const previous = makeElement("button", "", "‹ Trước");
        previous.type = "button";
        previous.disabled = page <= 1;
        previous.addEventListener("click", () => runSearch(query, page - 1));

        const pageLabel = makeElement("span", "", `${page} / ${totalPages}`);

        const next = makeElement("button", "", "Sau ›");
        next.type = "button";
        next.disabled = page >= totalPages;
        next.addEventListener("click", () => runSearch(query, page + 1));

        pagination.append(previous, pageLabel, next);
        section.appendChild(pagination);
    }

    content.appendChild(section);
    content.scrollTop = 0;
}

async function runSearch(rawQuery, page = 1, fromRoute = false) {
    const query = rawQuery.trim();
    if (!query) {
        input.focus();
        return;
    }

    clearTimeout(debounceTimer);

    if (!fromRoute) {
        const params = new URLSearchParams({ q: query, page: String(page) });
        navigateTo(`/search?${params}`);
        return;
    }

    input.value = query;
    currentQuery = query;
    currentPage = page;
    closeSuggestions();

    if (currentResultsQuery === query && currentResultsData) {
        renderResults(currentResultsData, query, page);
        return;
    }

    currentResultsQuery = query;
    currentResultsData = null;
    currentTypeFilter = "all";

    const requestId = ++resultRequest;
    content.replaceChildren();
    const loading = makeElement("p", "search-loading", "Đang tìm kiếm...");
    content.appendChild(loading);

    const params = new URLSearchParams({
        q: query,
        limit: String(API_RESULTS_LIMIT),
        page: "1"
    });

    try {
        const data = await getJson(`/search?${params}`);
        if (requestId === resultRequest) {
            currentResultsData = data;
            renderResults(data, query, page);
        }
    } catch (error) {
        if (requestId === resultRequest) {
            content.replaceChildren(makeElement("p", "search-error", error.message));
        }
    }
}

export function showSearchResults(query, page = 1) {
    return runSearch(query, page, true);
}

export function initSearch() {
    if (!input || !panel || !content) {
        return;
    }


    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (!query) {
            closeSuggestions();
            return;
        }

        debounceTimer = setTimeout(() => loadSuggestions(query), 250);
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            runSearch(input.value);
        } else if (event.key === "Escape") {
            closeSuggestions();
            input.blur();
        }
    });

    submitButton?.addEventListener("click", () => {
        runSearch(input.value);
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            loadSuggestions(input.value.trim());
        }
    });

    document.addEventListener("click", (event) => {
        if (!searchBox.contains(event.target)) {
            closeSuggestions();
        }
    });
}
