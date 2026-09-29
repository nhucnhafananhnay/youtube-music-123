import { getCategories, getLines } from "../services/catalog.js";
import { navigateTo } from "../libs/router.js";

const sidebar = document.querySelector(".sidebar");
const sidebarMenu = document.querySelector("#sidebarMenu");
const content = document.querySelector("#content");
const linesToggle = document.querySelector(".sidebar-lines-toggle");
const linesFlyout = document.querySelector("#linesFlyout");

let activeExploreTarget = "";
let pendingExploreTarget = "";
let closeTimer;

function setLinesFlyoutOpen(isOpen) {
    if (!linesFlyout || !linesToggle) {
        return;
    }

    linesFlyout.hidden = !isOpen;
    linesToggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const toggleRect = linesToggle.getBoundingClientRect();
        const maximumTop = window.innerHeight - linesFlyout.offsetHeight - 12;
        let top = toggleRect.top;

        if (top > maximumTop) {
            top = maximumTop;
        }
        if (top < 12) {
            top = 12;
        }

        linesFlyout.style.left = `${sidebarRect.right}px`;
        linesFlyout.style.top = `${top}px`;
    }
}

function cancelClose() {
    clearTimeout(closeTimer);
}

function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(function () {
        setLinesFlyoutOpen(false);
    }, 180);
}

function renderSidebarItems(containerId, items, routeType) {
    const container = document.querySelector(`#${containerId}`);
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (items.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "sidebar-status";
        emptyMessage.textContent = "Chưa có dữ liệu.";
        container.appendChild(emptyMessage);
        return;
    }

    for (const item of items) {
        if (!item.slug || !item.name) {
            continue;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "sidebar-item small-item";
        button.dataset.route = `/${routeType}/${encodeURIComponent(item.slug)}`;

        const icon = document.createElement("span");
        icon.className = "icon";
        if (routeType === "lines") {
            icon.textContent = "♪";
        } else {
            icon.textContent = "◉";
        }

        const label = document.createElement("span");
        label.textContent = item.name;
        button.appendChild(icon);
        button.appendChild(label);
        container.appendChild(button);
    }
}

async function loadSidebarData() {
    try {
        const lines = await getLines();
        const categories = await getCategories();

        renderSidebarItems("sidebarLines", lines, "lines");
        renderSidebarItems("sidebarCategories", categories, "categories");
        updateActiveNavigation(window.location.pathname);
    } catch (error) {
        console.error("Sidebar:", error);

        const listIds = ["sidebarLines", "sidebarCategories"];
        for (const id of listIds) {
            const list = document.querySelector(`#${id}`);
            if (!list) {
                continue;
            }

            const errorMessage = document.createElement("p");
            errorMessage.className = "sidebar-status";
            errorMessage.textContent = "Không thể tải danh sách.";
            list.replaceChildren(errorMessage);
        }
    }
}

function updateActiveNavigation(pathname) {
    if (!sidebarMenu) {
        return;
    }

    const decodedPath = decodeURIComponent(pathname);
    const items = document.querySelectorAll(
        ".sidebar-menu .sidebar-item, .lines-flyout .sidebar-item"
    );

    for (const item of items) {
        item.classList.remove("active");

        if (item.dataset.page === "home" && (decodedPath === "/" || decodedPath === "/home")) {
            item.classList.add("active");
        }
        if (item.dataset.page === "explore") {
            const onExplorePage = decodedPath === "/explore";
            const onCategoryPage = decodedPath.startsWith("/categories/");
            const onLinePage = decodedPath.startsWith("/lines/");
            if (onExplorePage || onCategoryPage || onLinePage) {
                item.classList.add("active");
            }
        }
        if (item.dataset.page === "library" && decodedPath === "/library") {
            item.classList.add("active");
        }

        if (item.dataset.route) {
            const itemPath = new URL(item.dataset.route, window.location.origin).pathname;
            if (decodeURIComponent(itemPath) === decodedPath) {
                item.classList.add("active");
            }
        }

        if (item.dataset.exploreTarget && decodedPath === "/explore") {
            if (item.dataset.exploreTarget === activeExploreTarget) {
                item.classList.add("active");
            }
        }
    }

    if (linesToggle) {
        linesToggle.classList.toggle("active", decodedPath.startsWith("/lines/"));
    }
}

function scrollToExploreTarget(targetId) {
    if (!targetId || !content) {
        return;
    }

    const target = document.getElementById(targetId);
    if (!target || !content.contains(target)) {
        return;
    }

    const contentTop = content.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top - contentTop + content.scrollTop;
    content.scrollTo({ top: targetTop, behavior: "auto" });
}

function handleNavigationClick(event) {
    const item = event.target.closest(".sidebar-item");
    if (!item) {
        return;
    }

    if (item.dataset.page) {
        let path = `/${item.dataset.page}`;
        if (item.dataset.page === "home") {
            path = "/home";
        }
        navigateTo(path);
        return;
    }

    if (item.dataset.route) {
        setLinesFlyoutOpen(false);
        navigateTo(item.dataset.route);
        return;
    }

    if (item.dataset.exploreTarget) {
        activeExploreTarget = item.dataset.exploreTarget;
        const target = document.getElementById(activeExploreTarget);

        if (window.location.pathname === "/explore" && target && content.contains(target)) {
            scrollToExploreTarget(activeExploreTarget);
            updateActiveNavigation(window.location.pathname);
        } else {
            pendingExploreTarget = activeExploreTarget;
            navigateTo("/explore");
        }
    }
}

export function initSidebar() {
    const menuButton = document.querySelector(".menu-btn");

    if (menuButton) {
        menuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            sidebar.classList.toggle("collapsed");
            document.body.classList.toggle("sidebar-collapsed", sidebar.classList.contains("collapsed"));
            setLinesFlyoutOpen(false);
        });
    }

    document.addEventListener("click", function (event) {
        const clickedSidebar = sidebar.contains(event.target);
        const clickedFlyout = linesFlyout.contains(event.target);

        if (!clickedSidebar && !clickedFlyout && !sidebar.classList.contains("collapsed")) {
            sidebar.classList.add("collapsed");
            document.body.classList.add("sidebar-collapsed");
        }
    });

    sidebarMenu.addEventListener("click", handleNavigationClick);
    linesFlyout.addEventListener("click", handleNavigationClick);

    linesToggle.addEventListener("mouseenter", function () {
        cancelClose();
        setLinesFlyoutOpen(true);
    });
    linesToggle.addEventListener("mouseleave", scheduleClose);
    linesToggle.addEventListener("click", function () {
        if (window.matchMedia("(hover: none)").matches) {
            setLinesFlyoutOpen(linesFlyout.hidden);
        } else {
            setLinesFlyoutOpen(true);
        }
    });

    linesFlyout.addEventListener("mouseenter", function () {
        cancelClose();
        setLinesFlyoutOpen(true);
    });
    linesFlyout.addEventListener("mouseleave", scheduleClose);

    sidebar.addEventListener("mouseleave", function (event) {
        if (!linesFlyout.contains(event.relatedTarget)) {
            scheduleClose();
        }
    });

    document.addEventListener("click", function (event) {
        const clickedFlyout = linesFlyout.contains(event.target);
        const clickedToggle = linesToggle.contains(event.target);

        if (!linesFlyout.hidden && !clickedFlyout && !clickedToggle) {
            setLinesFlyoutOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setLinesFlyoutOpen(false);
        }
    });

    window.addEventListener("resize", function () {
        if (!linesFlyout.hidden) {
            setLinesFlyoutOpen(true);
        }
    });

    window.addEventListener("route:changed", function (event) {
        const pathname = event.detail.pathname || window.location.pathname;
        updateActiveNavigation(pathname);

        if (pendingExploreTarget) {
            scrollToExploreTarget(pendingExploreTarget);
            pendingExploreTarget = "";
        }
    });

    document.body.classList.toggle("sidebar-collapsed", sidebar.classList.contains("collapsed"));
    loadSidebarData();
}
