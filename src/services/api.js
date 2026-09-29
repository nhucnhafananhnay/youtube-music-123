export const API_BASE_URL = "/api";

export function fetchApi(endpoint, options = {}) {
    return fetch(`${API_BASE_URL}${endpoint}`, options);
}
