let content;
let requestNumber = 0;

export function navigateTo(path, options = {}) {
    const target = new URL(path, window.location.origin);
    const targetPath = `${target.pathname}${target.search}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (targetPath === currentPath) {
        window.dispatchEvent(new Event("app:navigate"));
        return;
    }

    const state = {
        appRoute: true,
        previousPath: currentPath
    };

    if (options.replace) {
        window.history.replaceState(state, "", targetPath);
    } else {
        window.history.pushState(state, "", targetPath);
    }

    window.dispatchEvent(new Event("app:navigate"));
}

export function navigateBack(fallback = "/home") {
    if (window.history.state?.appRoute && window.history.state.previousPath) {
        window.history.back();
        return;
    }

    navigateTo(fallback, { replace: true });
}

async function loadPage(pageName, options, requestId) {
    let pageModule;

    if (pageName === "home") {
        pageModule = await import("../pages/home/index.js");
    } else if (pageName === "explore") {
        pageModule = await import("../pages/explore/index.js");
    } else if (pageName === "category") {
        pageModule = await import("../pages/category/index.js");
    } else if (pageName === "line") {
        pageModule = await import("../pages/line/index.js");
    } else if (pageName === "library") {
        pageModule = await import("../pages/library/index.js");
    } else if (pageName === "account") {
        pageModule = await import("../pages/account/index.js");
    } else if (pageName === "login") {
        pageModule = await import("../pages/login/index.js");
    }

    if (!pageModule) {
        return;
    }

    if (requestId !== requestNumber) {
        return;
    }

    await pageModule.renderPage(content, options);
}

async function renderRoute() {
    requestNumber++;
    const thisRequest = requestNumber;
    const pathname = decodeURIComponent(window.location.pathname);
    const searchParams = new URLSearchParams(window.location.search);
    const pathParts = pathname.split("/");

    try {
        if (pathname === "/search") {
            const searchPage = await import("../components/search.js");

            if (thisRequest === requestNumber) {
                const query = searchParams.get("q") || "";
                const page = Number(searchParams.get("page") || 1);
                await searchPage.showSearchResults(query, page);
            }
        } else if (
            pathParts.length === 4
            && pathParts[2] === "details"
            && ["albums", "songs", "playlists", "videos"].includes(pathParts[1])
        ) {
            const detailsPage = await import("../pages/details/index.js");
            const itemType = pathParts[1].slice(0, -1);
            const identifier = pathParts[3];
            let item;

            if (itemType === "album" || itemType === "playlist") {
                item = { type: itemType, slug: identifier };
            } else {
                item = { type: itemType, id: identifier };
            }

            if (thisRequest === requestNumber) {
                await detailsPage.showDetails(item, { navigate: false });
            }
        } else if (pathParts.length === 3 && pathParts[1] === "moods" && pathParts[2]) {
            await loadPage("home", { moodSlug: pathParts[2] }, thisRequest);
        } else if (pathParts.length === 3 && pathParts[1] === "categories" && pathParts[2]) {
            await loadPage("category", {}, thisRequest);
        } else if (pathParts.length === 3 && pathParts[1] === "lines" && pathParts[2]) {
            await loadPage("line", {}, thisRequest);
        } else if (pathname === "/" || pathname === "/home") {
            await loadPage("home", {}, thisRequest);
        } else if (pathname === "/explore") {
            await loadPage("explore", {}, thisRequest);
        } else if (pathname === "/library") {
            await loadPage("library", {}, thisRequest);
        } else if (pathname === "/login") {
            await loadPage("login", {}, thisRequest);
        } else if (pathname === "/account") {
            await loadPage("account", {}, thisRequest);
        } else {
            navigateTo("/home", { replace: true });
            return;
        }

        if (thisRequest === requestNumber) {
            content.scrollTop = 0;
            window.dispatchEvent(new CustomEvent("route:changed", {
                detail: { pathname }
            }));
        }
    } catch (error) {
        console.error("Không thể tải trang:", error);

        if (thisRequest === requestNumber) {
            content.innerHTML = '<div class="page-load-error">Không thể tải trang.</div>';
        }
    }
}

export function startRouter(contentElement) {
    content = contentElement;

    window.addEventListener("popstate", renderRoute);
    window.addEventListener("app:navigate", renderRoute);

    if (!window.history.state?.appRoute) {
        window.history.replaceState({
            appRoute: true,
            previousPath: null
        }, "", window.location.href);
    }

    renderRoute();
}
