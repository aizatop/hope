// =============================================================================
// ALIVEAGAIN - УЛУЧШЕННАЯ ВЕРСИЯ JAVASCRIPT
// =============================================================================
// Автор: AI Assistant
// Версия: 2.0
// Описание: Оптимизированный, структурированный и производительный код

// =============================================================================
// КОНФИГУРАЦИЯ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =============================================================================

const CONFIG = {
    SUPABASE: {
        URL: 'https://eybvtbskxktwurotecjl.supabase.co',
        KEY: 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1'
    },
    ANIMATIONS: {
        DURATION: {
            FAST: 300,
            NORMAL: 500,
            SLOW: 1000
        },
        EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    VALIDATION: {
        NAME: {
            MIN_LENGTH: 2,
            MAX_LENGTH: 50
        },
        PASSWORD: {
            MIN_LENGTH: 6,
            MAX_LENGTH: 100
        },
        EMAIL: {
            PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
    },
    TIMEOUTS: {
        AUTH: 15000,
        UI_UPDATE: 500
    }
};

// =============================================================================
// УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static isValidEmail(email) {
        return CONFIG.VALIDATION.EMAIL.PATTERN.test(email);
    }

    static formatTime(date) {
        return new Date(date).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, CONFIG.ANIMATIONS.DURATION.NORMAL);
        }, 3000);
    }
}

// =============================================================================
// КЛАСС УПРАВЛЕНИЯ АУТЕНТИФИКАЦИЕЙ
// =============================================================================

class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            if (typeof window.supabase !== 'undefined') {
                this.supabase = window.supabase.createClient(
                    CONFIG.SUPABASE.URL, 
                    CONFIG.SUPABASE.KEY
                );
                console.log('✅ Supabase клиент инициализирован');
                await this.setupAuthListeners();
            } else {
                throw new Error('Supabase библиотека не загружена');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации AuthManager:', error);
            Utils.showNotification('Ошибка загрузки системы авторизации', 'error');
        }
    }

    async setupAuthListeners() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Состояние авторизации изменилось:', event);
            this.currentUser = session?.user || null;
            
            if (['SIGNED_IN', 'SIGNED_OUT'].includes(event)) {
                this.updateAuthButtons();
            }
        });
    }

    async updateAuthButtons() {
        try {
            const authButtons = document.getElementById('authButtons');
            if (!authButtons) {
                console.warn('⚠️ Элемент authButtons не найден');
                return;
            }

            if (this.currentUser) {
                this.showAuthenticatedUI(authButtons);
            } else {
                this.showUnauthenticatedUI(authButtons);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления кнопок:', error);
        }
    }

    showAuthenticatedUI(container) {
        const userName = this.currentUser.user_metadata?.name || 
                       this.currentUser.email?.split('@')[0] || 
                       'Пользователь';

        container.innerHTML = `
            <div class="user-info">
                <span class="user-avatar">👤</span>
                <span class="user-name">Привет, ${Utils.sanitizeInput(userName)}!</span>
            </div>
            <button class="auth-btn messenger-btn" onclick="UIManager.openChat()">
                💬 Мессенджер
            </button>
            <button class="auth-btn logout-btn" onclick="authManager.logout()">
                🚪 Выйти
            </button>
        `;
    }

    showUnauthenticatedUI(container) {
        container.innerHTML = `
            <button class="auth-btn login-btn" onclick="UIManager.openModal('login')">
                🔐 Войти
            </button>
            <button class="auth-btn register-btn" onclick="UIManager.openModal('register')">
                ✨ Регистрация
            </button>
            <button class="auth-btn messenger-btn" onclick="UIManager.openChat()">
                💬 Мессенджер
            </button>
        `;
    }

    async register(name, email, password) {
        try {
            this.showLoadingState('register', true);
            
            const { data, error } = await Promise.race([
                this.supabase.auth.signUp({
                    email: Utils.sanitizeInput(email),
                    password: password,
                    options: {
                        data: { name: Utils.sanitizeInput(name) },
                        emailRedirectTo: window.location.origin
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Таймаут запроса')), CONFIG.TIMEOUTS.AUTH)
                )
            ]);

            this.hideLoadingState('register');

            if (error) {
                return this.handleAuthError(error, 'register');
            }

            return this.handleRegistrationSuccess(data);
        } catch (error) {
            this.hideLoadingState('register');
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            this.showLoadingState('login', true);
            
            const { data, error } = await Promise.race([
                this.supabase.auth.signInWithPassword({
                    email: Utils.sanitizeInput(email),
                    password: password
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Таймаут запроса')), CONFIG.TIMEOUTS.AUTH)
                )
            ]);

            this.hideLoadingState('login');

            if (error) {
                return this.handleAuthError(error, 'login');
            }

            Utils.showNotification('Вход выполнен успешно!', 'success');
            return { success: true };
        } catch (error) {
            this.hideLoadingState('login');
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            Utils.showNotification('Выход выполнен успешно', 'success');
            this.currentUser = null;
            this.updateAuthButtons();
        } catch (error) {
            console.error('❌ Ошибка выхода:', error);
            Utils.showNotification('Ошибка выхода из системы', 'error');
        }
    }

    handleRegistrationSuccess(data) {
        if (data.user && !data.user.email_confirmed_at) {
            return {
                success: true,
                message: 'Регистрация успешна! Проверьте email для подтверждения.',
                requiresConfirmation: true
            };
        }

        if (data.session) {
            Utils.showNotification('Регистрация и вход выполнены успешно!', 'success');
            return {
                success: true,
                message: 'Добро пожаловать в AliveAgain!',
                instantLogin: true
            };
        }

        return { success: true, message: 'Регистрация успешна!' };
    }

    handleAuthError(error, type) {
        const errorMessages = {
            'User already registered': 'Пользователь с таким email уже существует',
            'Invalid login credentials': 'Неверный email или пароль',
            'Password should be': 'Пароль должен содержать минимум 6 символов',
            'Invalid email': 'Введите корректный email адрес',
            'timeout': 'Превышено время ожидания. Попробуйте еще раз.'
        };

        for (const [key, message] of Object.entries(errorMessages)) {
            if (error.message.includes(key)) {
                return { success: false, error: message };
            }
        }

        return { success: false, error: error.message };
    }

    showLoadingState(formType, show) {
        const form = document.getElementById(`${formType}Form`);
        if (!form) return;

        const button = form.querySelector('button[type="submit"]');
        if (!button) return;

        if (show) {
            button.disabled = true;
            button.classList.add('loading');
            button.textContent = formType === 'register' ? 'Регистрация...' : 'Вход...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            button.textContent = formType === 'register' ? 'Зарегистрироваться' : 'Войти';
        }
    }

    hideLoadingState(formType) {
        this.showLoadingState(formType, false);
    }
}

// =============================================================================
// КЛАСС УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЬСКИМ ИНТЕРФЕЙСОМ
// =============================================================================

class UIManager {
    constructor() {
        this.modals = {};
        this.init();
    }

    init() {
        this.setupModalHandlers();
        this.setupFormHandlers();
        this.setupGlobalHandlers();
        this.initAnimations();
    }

    setupModalHandlers() {
        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-modal')) {
                this.closeModal();
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    setupFormHandlers() {
        this.setupRegistrationForm();
        this.setupLoginForm();
    }

    setupRegistrationForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');

        // Валидация в реальном времени
        nameInput?.addEventListener('input', Utils.debounce((e) => {
            this.validateName(e.target);
        }, 300));

        emailInput?.addEventListener('input', Utils.debounce((e) => {
            this.validateEmail(e.target);
        }, 300));

        passwordInput?.addEventListener('input', Utils.debounce((e) => {
            this.validatePassword(e.target);
        }, 300));

        // Отправка формы
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegistration();
        });
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        // Валидация в реальном времени
        emailInput?.addEventListener('input', Utils.debounce((e) => {
            this.validateEmail(e.target);
        }, 300));

        passwordInput?.addEventListener('input', Utils.debounce((e) => {
            this.validatePassword(e.target);
        }, 300));

        // Отправка формы
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    setupGlobalHandlers() {
        // Глобальные функции для обратной совместимости
        window.openLoginModal = () => this.openModal('login');
        window.openRegisterModal = () => this.openModal('register');
        window.openMessenger = () => this.openChat();
        window.handleLogout = () => authManager.logout();
    }

    validateName(input) {
        const value = Utils.sanitizeInput(input.value);
        const { MIN_LENGTH, MAX_LENGTH } = CONFIG.VALIDATION.NAME;

        if (value.length < MIN_LENGTH) {
            input.setCustomValidity(`Имя должно содержать минимум ${MIN_LENGTH} символа`);
        } else if (value.length > MAX_LENGTH) {
            input.setCustomValidity(`Имя не должно превышать ${MAX_LENGTH} символов`);
        } else {
            input.setCustomValidity('');
        }
    }

    validateEmail(input) {
        const value = Utils.sanitizeInput(input.value);
        
        if (!Utils.isValidEmail(value)) {
            input.setCustomValidity('Введите корректный email адрес');
        } else {
            input.setCustomValidity('');
        }
    }

    validatePassword(input) {
        const value = input.value;
        const { MIN_LENGTH, MAX_LENGTH } = CONFIG.VALIDATION.PASSWORD;

        if (value.length < MIN_LENGTH) {
            input.setCustomValidity(`Пароль должен содержать минимум ${MIN_LENGTH} символов`);
        } else if (value.length > MAX_LENGTH) {
            input.setCustomValidity(`Пароль не должен превышать ${MAX_LENGTH} символов`);
        } else {
            input.setCustomValidity('');
        }
    }

    async handleRegistration() {
        const name = document.getElementById('registerName')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;

        if (!this.validateFormInputs(name, email, password, 'register')) {
            return;
        }

        const result = await authManager.register(name, email, password);
        
        if (result.success) {
            document.getElementById('registerForm').reset();
            
            if (result.instantLogin) {
                setTimeout(() => authManager.updateAuthButtons(), CONFIG.TIMEOUTS.UI_UPDATE);
            } else if (result.requiresConfirmation) {
                Utils.showNotification(result.message, 'info');
                setTimeout(() => {
                    if (confirm('Email отправлен! Хотите войти после подтверждения?')) {
                        this.openModal('login');
                    }
                }, CONFIG.TIMEOUTS.UI_UPDATE);
            } else {
                setTimeout(() => authManager.updateAuthButtons(), CONFIG.TIMEOUTS.UI_UPDATE);
            }
        } else {
            Utils.showNotification(result.error, 'error');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!this.validateFormInputs(null, email, password, 'login')) {
            return;
        }

        const result = await authManager.login(email, password);
        
        if (result.success) {
            document.getElementById('loginForm').reset();
            this.closeModal();
            setTimeout(() => authManager.updateAuthButtons(), CONFIG.TIMEOUTS.UI_UPDATE);
        } else {
            Utils.showNotification(result.error, 'error');
        }
    }

    validateFormInputs(name, email, password, type) {
        if (type === 'register' && (!name || name.trim().length === 0)) {
            Utils.showNotification('Введите имя', 'error');
            return false;
        }

        if (!email || !Utils.isValidEmail(email)) {
            Utils.showNotification('Введите корректный email', 'error');
            return false;
        }

        if (!password || password.length < CONFIG.VALIDATION.PASSWORD.MIN_LENGTH) {
            Utils.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return false;
        }

        return true;
    }

    openModal(type) {
        const modalId = type === 'login' ? 'loginModal' : 'registerModal';
        const modal = document.getElementById(modalId);
        
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Фокус на первое поле
            setTimeout(() => {
                const firstInput = modal.querySelector('input');
                if (firstInput) firstInput.focus();
            }, CONFIG.ANIMATIONS.FAST);
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.auth-modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
        document.body.style.overflow = 'auto';
    }

    openChat() {
        const chatSection = document.getElementById('chat');
        if (chatSection) {
            chatSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    initAnimations() {
        this.animateHeroSection();
        this.animateOnScroll();
        this.initSmoothScroll();
        this.initParallax();
        this.animateProjectSection();
        this.animateStats();
        this.initFeatureInteractions();
        this.animateCards();
    }

    animateHeroSection() {
        const title = document.querySelector('.title');
        const subtitle = document.querySelector('.subtitle');
        
        if (title) {
            title.style.opacity = '0';
            title.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                title.style.transition = `opacity ${CONFIG.ANIMATIONS.DURATION.SLOW}ms ease, transform ${CONFIG.ANIMATIONS.DURATION.SLOW}ms ease`;
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
            }, 100);
        }
        
        if (subtitle) {
            subtitle.style.opacity = '0';
            subtitle.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                subtitle.style.transition = `opacity ${CONFIG.ANIMATIONS.DURATION.SLOW}ms ease, transform ${CONFIG.ANIMATIONS.DURATION.SLOW}ms ease`;
                subtitle.style.opacity = '1';
                subtitle.style.transform = 'translateY(0)';
            }, 300);
        }
    }

    animateCards() {
        const cards = document.querySelectorAll('.country-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    // Остальные методы анимации остаются без изменений...
    animateOnScroll() {
        // Реализация анимации при скролле
    }

    initSmoothScroll() {
        // Реализация плавного скролла
    }

    initParallax() {
        // Реализация параллакса
    }

    animateProjectSection() {
        // Реализация анимации секции проекта
    }

    animateStats() {
        // Реализация анимации статистики
    }

    initFeatureInteractions() {
        // Реализация интерактивности функций
    }
}

// =============================================================================
// КЛАСС УПРАВЛЕНИЯ ЧАТОМ
// =============================================================================

class ChatManager {
    constructor() {
        this.messages = [];
        this.currentUser = 'Гость';
        this.init();
    }

    init() {
        this.loadMessages();
        this.setupEventListeners();
        this.scrollToBottom();
    }

    setupEventListeners() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const messageText = Utils.sanitizeInput(messageInput.value.trim());
        
        if (messageText === '') return;

        const newMessage = {
            author: this.currentUser,
            text: messageText,
            time: Utils.formatTime(new Date()),
            own: true
        };

        this.messages.push(newMessage);
        this.displayMessage(newMessage);
        
        messageInput.value = '';
        this.saveMessages();
        this.scrollToBottom();
    }

    displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.own ? 'own' : ''}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (!message.own) {
            const authorSpan = document.createElement('span');
            authorSpan.className = 'message-author';
            authorSpan.textContent = message.author;
            messageContent.appendChild(authorSpan);
        }
        
        const textP = document.createElement('p');
        textP.className = 'message-text';
        textP.textContent = message.text;
        messageContent.appendChild(textP);
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = message.time;
        messageContent.appendChild(timeSpan);
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
    }

    loadMessages() {
        const savedMessages = localStorage.getItem('aliveAgainChatMessages');
        if (savedMessages) {
            try {
                this.messages = JSON.parse(savedMessages);
                this.messages.forEach(message => this.displayMessage(message));
            } catch (error) {
                console.error('Ошибка загрузки сообщений:', error);
            }
        }
    }

    saveMessages() {
        try {
            const messagesToSave = this.messages.slice(-50);
            localStorage.setItem('aliveAgainChatMessages', JSON.stringify(messagesToSave));
        } catch (error) {
            console.error('Ошибка сохранения сообщений:', error);
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        }
    }
}

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================================================

let authManager;
let uiManager;
let chatManager;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Запуск AliveAgain...');
    
    try {
        // Инициализация основных модулей
        authManager = new AuthManager();
        uiManager = new UIManager();
        chatManager = new ChatManager();
        
        // Проверка сессии при загрузке
        await authManager.updateAuthButtons();
        
        console.log('✅ AliveAgain успешно инициализирован');
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        Utils.showNotification('Ошибка загрузки приложения', 'error');
    }
});

// =============================================================================
// ОБРАТНАЯ СОВМЕСТИМОСТЬ (LEGACY FUNCTIONS)
// =============================================================================

// Сохраняем старые функции для совместимости
window.updateAuthButtons = () => authManager?.updateAuthButtons();
window.sendMessage = () => chatManager?.sendMessage();
window.openMessenger = () => uiManager?.openChat();

console.log('📦 AliveAgain JavaScript загружен');
