import { fetchApi } from "./api.js";

export function getAccessToken() {
    return localStorage.getItem("token");
}

export function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return JSON.parse(storedUser || "null");
    } catch {
        return null;
    }
}

export function saveAuthSession(data, fallbackUser = null) {
    if (!data.access_token) {
        throw new Error("API không trả về access token.");
    }

    localStorage.setItem("token", data.access_token);
    if (data.refresh_token) {
        localStorage.setItem("refreshToken", data.refresh_token);
    }
    localStorage.setItem("user", JSON.stringify(data.user || fallbackUser));
}

export function clearAuthSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:changed"));
}

async function readResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    try {
        const response = await fetchApi("/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });
        const data = await readResponse(response);

        if (!response.ok || !data.access_token) {
            clearAuthSession();
            return false;
        }

        localStorage.setItem("token", data.access_token);
        if (data.refresh_token) {
            localStorage.setItem("refreshToken", data.refresh_token);
        }
        return true;
    } catch {
        return false;
    }
}

async function sendRequest(endpoint, options, canRefresh) {
    const headers = new Headers(options.headers || {});
    const token = getAccessToken();
    const isLoginOrRegister =
        endpoint === "/auth/login" || endpoint === "/auth/register";

    if (token && !isLoginOrRegister) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetchApi(endpoint, { ...options, headers });

    if (response.status === 401 && canRefresh && !isLoginOrRegister) {
        const tokenWasRefreshed = await refreshAccessToken();

        if (tokenWasRefreshed) {
            return sendRequest(endpoint, options, false);
        }
    }

    const data = await readResponse(response);
    if (!response.ok) {
        if (response.status === 401 && !isLoginOrRegister) {
            clearAuthSession();
        }
        throw new Error(data.message || `Yêu cầu thất bại (${response.status}).`);
    }

    return data;
}

export function authRequest(endpoint, options = {}) {
    return sendRequest(endpoint, options, true);
}
