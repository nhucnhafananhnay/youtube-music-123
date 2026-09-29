import view from "./view.html?raw";
import { authRequest, saveAuthSession } from "../../services/auth.js";
import { navigateTo } from "../../libs/router.js";

export function initLogin() {
    const form = document.querySelector("#authForm");
    const nameGroup = document.querySelector("#nameGroup");
    const confirmGroup = document.querySelector("#confirmPasswordGroup");
    const nameInput = document.querySelector("#name");
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    const confirmPasswordInput = document.querySelector("#confirmPassword");
    const message = document.querySelector("#authMessage");
    const submitButton = document.querySelector("#authSubmit");
    const modeButton = document.querySelector("#authModeToggle");
    const title = document.querySelector("#authTitle");
    const description = document.querySelector("#authDescription");
    let mode = "login";

    modeButton.addEventListener("click", () => {
        mode = mode === "login" ? "register" : "login";
        const registering = mode === "register";

        nameGroup.hidden = !registering;
        confirmGroup.hidden = !registering;
        nameInput.required = registering;
        confirmPasswordInput.required = registering;

        if (registering) {
            passwordInput.autocomplete = "new-password";
            title.textContent = "Tạo tài khoản";
            description.textContent = "Đăng ký bằng email để bắt đầu sử dụng tài khoản âm nhạc.";
            submitButton.textContent = "Đăng ký";
            modeButton.textContent = "Đã có tài khoản? Đăng nhập";
        } else {
            passwordInput.autocomplete = "current-password";
            title.textContent = "Đăng nhập";
            description.textContent = "Đăng nhập để tiếp tục sử dụng tài khoản âm nhạc.";
            submitButton.textContent = "Đăng nhập";
            modeButton.textContent = "Chưa có tài khoản? Đăng ký";
        }

        message.textContent = "";
    });

    document.querySelector("#showPassword").addEventListener("click", (event) => {
        const button = event.currentTarget;
        const inputs = document.querySelectorAll(".auth-password-input");
        let show = false;
        if (passwordInput.type === "password") {
            show = true;
        }

        inputs.forEach((input) => {
            if (show) {
                input.type = "text";
            } else {
                input.type = "password";
            }
        });
        if (show) {
            button.textContent = "Ẩn";
        } else {
            button.textContent = "Hiện";
        }
        button.setAttribute("aria-pressed", String(show));
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "";

        if (mode === "register" && passwordInput.value !== confirmPasswordInput.value) {
            message.textContent = "Mật khẩu xác nhận không khớp.";
            confirmPasswordInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = mode === "register" ? "Đang đăng ký..." : "Đang đăng nhập...";

        try {
            const fallbackUser = { name: nameInput.value.trim(), email: emailInput.value.trim() };
            let endpoint = "/auth/login";
            let requestBody = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            if (mode === "register") {
                endpoint = "/auth/register";
                requestBody = {
                    ...fallbackUser,
                    password: passwordInput.value,
                    confirmPassword: confirmPasswordInput.value
                };
            }

            const data = await authRequest(endpoint, {
                method: "POST",
                body: JSON.stringify(requestBody)
            });

            saveAuthSession(data, fallbackUser);
            window.dispatchEvent(new Event("auth:changed"));
            navigateTo("/home");
        } catch (error) {
            message.textContent = error.message || "Không thể xác thực tài khoản.";
        } finally {
            submitButton.disabled = false;
            if (mode === "register") {
                submitButton.textContent = "Đăng ký";
            } else {
                submitButton.textContent = "Đăng nhập";
            }
        }
    });
}

export async function renderPage(container) {
    container.innerHTML = view;
    return initLogin();
}
