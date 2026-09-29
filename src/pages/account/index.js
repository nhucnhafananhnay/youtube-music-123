import view from "./view.html?raw";
import { authRequest, clearAuthSession, getAccessToken, getStoredUser } from "../../services/auth.js";
import { navigateTo } from "../../libs/router.js";

function showMessage(element, text, isSuccess = false) {
    element.textContent = text;
    element.classList.toggle("success", isSuccess);
}

export async function initAccount() {
    const profileForm = document.querySelector("#profileForm");
    const passwordForm = document.querySelector("#changePasswordForm");
    const profileMessage = document.querySelector("#profileMessage");
    const passwordMessage = document.querySelector("#passwordMessage");
    const nameInput = document.querySelector("#profileName");
    const emailInput = document.querySelector("#profileEmail");

    if (!getAccessToken()) {
        navigateTo("/login");
        return;
    }

    try {
        const data = await authRequest("/auth/me");
        const user = data.user || data;
        nameInput.value = user.name || "";
        emailInput.value = user.email || "";
        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new Event("auth:changed"));
    } catch (error) {
        const user = getStoredUser();
        nameInput.value = user?.name || "";
        emailInput.value = user?.email || "";
        showMessage(profileMessage, error.message);
    }

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = profileForm.querySelector("button[type='submit']");
        submit.disabled = true;
        showMessage(profileMessage, "Đang lưu...");

        try {
            await authRequest("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim()
                })
            });

            const user = getStoredUser() || {};
            user.name = nameInput.value.trim();
            user.email = emailInput.value.trim();
            localStorage.setItem("user", JSON.stringify(user));
            window.dispatchEvent(new Event("auth:changed"));
            showMessage(profileMessage, "Đã cập nhật thông tin.", true);
        } catch (error) {
            showMessage(profileMessage, error.message);
        } finally {
            submit.disabled = false;
        }
    });

    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const oldPassword = document.querySelector("#oldPassword");
        const newPassword = document.querySelector("#newPassword");
        const confirmPassword = document.querySelector("#confirmNewPassword");
        const submit = passwordForm.querySelector("button[type='submit']");

        if (newPassword.value !== confirmPassword.value) {
            showMessage(passwordMessage, "Mật khẩu xác nhận không khớp.");
            confirmPassword.focus();
            return;
        }

        submit.disabled = true;
        showMessage(passwordMessage, "Đang cập nhật...");

        try {
            await authRequest("/auth/change-password", {
                method: "PATCH",
                body: JSON.stringify({
                    oldPassword: oldPassword.value,
                    password: newPassword.value,
                    confirmPassword: confirmPassword.value
                })
            });
            passwordForm.reset();
            showMessage(passwordMessage, "Đã đổi mật khẩu.", true);
        } catch (error) {
            showMessage(passwordMessage, error.message);
        } finally {
            submit.disabled = false;
        }
    });
}

export async function logout() {
    try {
        if (getAccessToken()) {
            await authRequest("/auth/logout", { method: "DELETE" });
        }
    } catch (error) {
        console.error("Đăng xuất API:", error);
    } finally {
        clearAuthSession();
        navigateTo("/home");
    }
}

export async function renderPage(container) {
    container.innerHTML = view;
    return initAccount();
}
