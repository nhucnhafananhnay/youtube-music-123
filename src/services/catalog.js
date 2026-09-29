import { getMusicData } from "./music.js";

export async function getLines(limit = 50) {
    const data = await getMusicData(`/lines?limit=${limit}`);
    return Array.isArray(data.items) ? data.items : [];
}

export async function getCategories() {
    const data = await getMusicData("/categories");
    return Array.isArray(data.items) ? data.items : [];
}
