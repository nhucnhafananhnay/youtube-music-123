import { authRequest, getAccessToken, getStoredUser } from "../services/auth.js";
import { navigateTo } from "../libs/router.js";

const accountMenu = document.querySelector("#accountMenu");
const accountTrigger = document.querySelector(".header .header-login");
const accountProfileButton = document.querySelector("#accountProfileButton");
const logoutButton = document.querySelector("#logoutButton");

function getUser() {
    return getAccessToken() ? getStoredUser() : null;
}

export function updateHeaderAccount() {
    const user = getUser();
    const avatar = document.querySelector("#accountAvatar");
    const label = document.querySelector("#accountLabel");
    let name = "";

    if (user) {
        name = user.name || user.username || user.email || "";
    }

    const nameParts = name.trim().split(/[\s@._-]+/);
    let initials = "";

    for (const part of nameParts) {
        if (part && initials.length < 2) {
            initials += part[0];
        }
    }

    initials = initials.toUpperCase();

    if (avatar) avatar.textContent = initials;
    if (label) label.textContent = user ? "" : "Đăng nhập";
    accountTrigger?.classList.toggle("logged-in", Boolean(user));
    accountTrigger?.setAttribute("aria-label", user ? `Tài khoản ${name}` : "Đăng nhập");
}

export function initHeader() {
    accountTrigger?.addEventListener("click", () => {
        if (!getUser()) {
            navigateTo("/login");
            return;
        }
        accountMenu?.classList.toggle("show");
        accountTrigger.setAttribute("aria-expanded", String(accountMenu?.classList.contains("show")));
    });

    accountProfileButton?.addEventListener("click", () => {
        accountMenu?.classList.remove("show");
        accountTrigger?.setAttribute("aria-expanded", "false");
        navigateTo("/account");
    });

    logoutButton?.addEventListener("click", async () => {
        accountMenu?.classList.remove("show");
        const { logout } = await import("../pages/account/index.js");
        await logout();
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".account-container")) {
            accountMenu?.classList.remove("show");
            accountTrigger?.setAttribute("aria-expanded", "false");
        }
    });
    window.addEventListener("auth:changed", updateHeaderAccount);
    window.addEventListener("auth:required", () => navigateTo("/login"));
    updateHeaderAccount();
}

export async function loadCurrentUser() {
    if (!getAccessToken()) {
        updateHeaderAccount();
        return;
    }

    try {
        const data = await authRequest("/auth/me");
        localStorage.setItem("user", JSON.stringify(data.user || data));
    } catch (error) {
        console.error("Không thể xác thực phiên:", error);
    }
    updateHeaderAccount();
}
