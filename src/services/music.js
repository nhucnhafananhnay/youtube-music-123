import { fetchApi } from "./api.js";

export function fetchMusic(endpoint, options = {}) {
    return fetchApi(endpoint, options);
}

export async function getMusicData(endpoint, options = {}) {
    const response = await fetchMusic(endpoint, options);
    if (!response.ok) {
        throw new Error(`API trả về lỗi ${response.status}`);
    }
    return response.json();
}
