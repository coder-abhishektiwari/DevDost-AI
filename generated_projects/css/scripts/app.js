
(() => {
    // ---------- Smooth Scroll ----------
    const initSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                const targetId = anchor.getAttribute('href').substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    };

    // ---------- Theme Toggle ----------
    const THEME_KEY = 'site-theme';
    const LIGHT_CLASS = 'light-theme';
    const DARK_CLASS = 'dark-theme';

    const applyTheme = theme => {
        const root = document.documentElement;
        root.classList.remove(LIGHT_CLASS, DARK_CLASS);
        root.classList.add(theme === 'dark' ? DARK_CLASS : LIGHT_CLASS);
    };

    const loadStoredTheme = () => {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) applyTheme(stored);
        else {
            // default to light
            applyTheme('light');
        }
    };

    const toggleTheme = () => {
        const current = document.documentElement.classList.contains(DARK_CLASS) ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
    };

    const initThemeToggle = () => {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', toggleTheme);
        loadStoredTheme();
    };

    // ---------- Form Validation ----------
    const showError = (input, message) => {
        clearError(input);
        const errorEl = document.createElement('span');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        errorEl.style.color = 'red';
        errorEl.style.fontSize = '0.9em';
        input.parentNode.appendChild(errorEl);
        input.classList.add('input-error');
    };

    const clearError = input => {
        const parent = input.parentNode;
        const err = parent.querySelector('.error-message');
        if (err) parent.removeChild(err);
        input.classList.remove('input-error');
    };

    const validateEmail = email => {
        // Simple email regex
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = e => {
        const form = e.target;
        let valid = true;

        // Name validation
        const nameInput = form.querySelector('input[name="name"]');
        if (nameInput) {
            clearError(nameInput);
            if (!nameInput.value.trim()) {
                showError(nameInput, 'Name is required.');
                valid = false;
            }
        }

        // Email validation
        const emailInput = form.querySelector('input[name="email"]');
        if (emailInput) {
            clearError(emailInput);
            if (!emailInput.value.trim()) {
                showError(emailInput, 'Email is required.');
                valid = false;
            } else if (!validateEmail(emailInput.value.trim())) {
                showError(emailInput, 'Enter a valid email address.');
                valid = false;
            }
        }

        // Message validation
        const messageInput = form.querySelector('textarea[name="message"]');
        if (messageInput) {
            clearError(messageInput);
            if (!messageInput.value.trim()) {
                showError(messageInput, 'Message cannot be empty.');
                valid = false;
            }
        }

        if (!valid) e.preventDefault();
    };

    const initFormValidation = () => {
        const form = document.getElementById('contact-form');
        if (!form) return;
        form.addEventListener('submit', validateForm);
    };

    // ---------- Init ----------
    document.addEventListener('DOMContentLoaded', () => {
        initSmoothScroll();
        initThemeToggle();
        initFormValidation();
    });
})();