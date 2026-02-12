// JavaScript для отдельной страницы чата
const supabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const supabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;
let messagesSubscription = null;
let onlineUsersSubscription = null;
let messageCount = 0;
let soundEnabled = true;
let darkTheme = false;

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Загрузка отдельной страницы чата...');
    
    // Проверяем авторизацию
    await checkAuthStatus();
    
    // Инициализируем чат
    await initializeChat();
    
    // Настраиваем обработчики
    setupEventListeners();
    
    console.log('Страница чата загружена');
});

// Проверка статуса авторизации
async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Ошибка проверки сессии:', error);
            currentUser = null;
        } else if (session && session.user) {
            currentUser = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                email: session.user.email
            };
            console.log('Пользователь авторизован:', currentUser);
        } else {
            currentUser = null;
            console.log('Пользователь не авторизован');
        }
        
        updateUserInterface();
        updateNavigation();
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        currentUser = null;
        updateUserInterface();
        updateNavigation();
    }
}

// Обновление интерфейса пользователя
function updateUserInterface() {
    const userStatusBar = document.getElementById('userStatusBar');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    if (currentUser) {
        // Авторизованный пользователь
        userStatusBar.innerHTML = `
            <span class="status-indicator online"></span>
            <span class="status-text">${currentUser.name}</span>
            <button class="login-btn" onclick="handleLogout()">Выйти</button>
        `;
        
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        updateChatStatus('Подключено к чату');
    } else {
        // Гость
        userStatusBar.innerHTML = `
            <span class="status-indicator offline"></span>
            <span class="status-text">Гость</span>
            <button class="login-btn" onclick="showLoginModal()">Войти для общения</button>
        `;
        
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        updateChatStatus('Требуется вход для отправки сообщений');
    }
}

// Обновление навигации
function updateNavigation() {
    const navAuth = document.getElementById('navAuth');
    
    if (currentUser) {
        navAuth.innerHTML = `
            <span class="user-info">Привет, ${currentUser.name}!</span>
            <button class="auth-btn logout-btn" onclick="handleLogout()">Выйти</button>
        `;
    } else {
        navAuth.innerHTML = `
            <button class="auth-btn login-btn" onclick="showLoginModal()">Войти</button>
            <button class="auth-btn register-btn" onclick="showRegisterModal()">Регистрация</button>
        `;
    }
}

// Инициализация чата
async function initializeChat() {
    try {
        // Загружаем сообщения
        await loadMessages();
        
        // Подписываемся на обновления
        subscribeToMessages();
        subscribeToOnlineUsers();
        
        // Обновляем онлайн статус если авторизован
        if (currentUser) {
            await updateOnlineStatus(true);
        }
        
        updateChatStatus('Подключено к чату');
    } catch (error) {
        console.error('Ошибка инициализации чата:', error);
        updateChatStatus('Ошибка подключения');
    }
}

// Загрузка сообщений
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);
            
        if (error) throw error;
        
        displayMessages(data || []);
        messageCount = data?.length || 0;
        updateMessageCount();
        
        scrollToBottom();
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        displayErrorMessage('Не удалось загрузить сообщения');
    }
}

// Отображение сообщений
function displayMessages(messages) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Удаляем приветственное сообщение если есть сообщения
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg && messages.length > 0) {
        welcomeMsg.remove();
    }
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });
}

// Создание элемента сообщения
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.user_id === currentUser?.id ? 'own-message' : 'other-message'}`;
    
    const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-author">${message.user_name}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
    `;
    
    return messageDiv;
}

// Отправка сообщения
async function sendMessage() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                user_id: currentUser.id,
                user_name: currentUser.name,
                text: text,
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        input.value = '';
        updateCharCount();
        console.log('Сообщение отправлено:', data);
        
        // Воспроизводим звук если включен
        if (soundEnabled) {
            playNotificationSound();
        }
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        displayErrorMessage('Не удалось отправить сообщение');
    }
}

// Подписка на сообщения
function subscribeToMessages() {
    messagesSubscription = supabase
        .channel('standalone_messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            },
            (payload) => {
                console.log('Новое сообщение:', payload.new);
                addNewMessage(payload.new);
                
                // Воспроизводим звук для новых сообщений других пользователей
                if (soundEnabled && payload.new.user_id !== currentUser?.id) {
                    playNotificationSound();
                }
            }
        )
        .subscribe();
}

// Подписка на онлайн пользователей
function subscribeToOnlineUsers() {
    onlineUsersSubscription = supabase
        .channel('standalone_online_users')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'online_users'
            },
            () => {
                loadOnlineUsers();
            }
        )
        .subscribe();
}

// Добавление нового сообщения
function addNewMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Удаляем приветственное сообщение
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    
    scrollToBottom();
    messageCount++;
    updateMessageCount();
}

// Загрузка онлайн пользователей
async function loadOnlineUsers() {
    try {
        const { data, error } = await supabase
            .from('online_users')
            .select('*')
            .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
            
        if (error) throw error;
        
        displayOnlineUsers(data || []);
        updateOnlineCount(data?.length || 0);
    } catch (error) {
        console.error('Ошибка загрузки онлайн пользователей:', error);
    }
}

// Отображение онлайн пользователей
function displayOnlineUsers(users) {
    const usersList = document.getElementById('onlineUsersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'online-user';
        userDiv.innerHTML = `
            <div class="online-avatar">${user.user_name.charAt(0).toUpperCase()}</div>
            <span>${user.user_name}</span>
        `;
        usersList.appendChild(userDiv);
    });
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="loading-users">Никто онлайн</div>';
    }
}

// Обновление онлайн статуса
async function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    try {
        if (isOnline) {
            await supabase
                .from('online_users')
                .upsert({
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    last_seen: new Date().toISOString()
                });
        } else {
            await supabase
                .from('online_users')
                .delete()
                .eq('user_id', currentUser.id);
        }
    } catch (error) {
        console.error('Ошибка обновления онлайн статуса:', error);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                alert('Вход выполнен успешно!');
                closeModal('loginModal');
                await checkAuthStatus();
                
                if (currentUser) {
                    await updateOnlineStatus(true);
                }
                
            } catch (error) {
                console.error('Ошибка входа:', error);
                alert('Ошибка входа: ' + error.message);
            }
        });
    }
    
    // Обработчик формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            name: name
                        }
                    }
                });
                
                if (error) throw error;
                
                alert('Регистрация успешна! Проверьте email для подтверждения.');
                closeModal('registerModal');
                
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }
    
    // Обработчик ввода сообщения
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', updateCharCount);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !messageInput.disabled) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Автоматическое изменение высоты textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
}

// Вспомогательные функции
function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateMessageCount() {
    const countElement = document.getElementById('messageCount');
    if (countElement) {
        countElement.textContent = messageCount;
    }
}

function updateOnlineCount(count) {
    const countElement = document.getElementById('onlineCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

function updateCharCount() {
    const input = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    if (charCount) {
        charCount.textContent = `${input.value.length}/500`;
    }
}

function updateChatStatus(status) {
    const statusElement = document.getElementById('chatStatus');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function displayErrorMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    messagesContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Модальные окна
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchToRegister() {
    closeModal('loginModal');
    showRegisterModal();
}

function switchToLogin() {
    closeModal('registerModal');
    showLoginModal();
}

// Выход
async function handleLogout() {
    try {
        await updateOnlineStatus(false);
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        updateUserInterface();
        updateNavigation();
        
        alert('Вы вышли из аккаунта');
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка выхода: ' + error.message);
    }
}

// Дополнительные функции
function toggleTheme() {
    darkTheme = !darkTheme;
    document.body.classList.toggle('dark-theme');
    
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.textContent = darkTheme ? '☀️' : '🌙';
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    
    const soundIcon = document.getElementById('soundIcon');
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
}

function playNotificationSound() {
    // Создаем простой звук уведомления
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function toggleEmoji() {
    const emojiPanel = document.getElementById('emojiPanel');
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    
    updateCharCount();
    toggleEmoji();
    input.focus();
}

function clearMessages() {
    if (confirm('Вы уверены, что хотите очистить историю сообщений?')) {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🌍</div>
                <h3>Чат очищен</h3>
                <p>История сообщений была удалена</p>
            </div>
        `;
        messageCount = 0;
        updateMessageCount();
    }
}

function toggleMobileMenu() {
    // Реализация для мобильного меню
    const navMenu = document.querySelector('.nav-menu');
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
}

// Очистка при выходе
window.addEventListener('beforeunload', async function() {
    if (currentUser) {
        await updateOnlineStatus(false);
    }
    
    if (messagesSubscription) {
        supabase.removeChannel(messagesSubscription);
    }
    
    if (onlineUsersSubscription) {
        supabase.removeChannel(onlineUsersSubscription);
    }
});

// Периодическое обновление онлайн статуса
setInterval(async function() {
    if (currentUser) {
        await updateOnlineStatus(true);
    }
}, 60000); // Каждую минуту

// Закрытие модальных окон по клику вне их
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('auth-modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.auth-modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        
        // Закрыть панель эмодзи
        const emojiPanel = document.getElementById('emojiPanel');
        if (emojiPanel.style.display === 'block') {
            emojiPanel.style.display = 'none';
        }
    }
});
