// JavaScript для мессенджер-интерфейса
const supabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const supabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;
let messagesSubscription = null;
let onlineUsersSubscription = null;
let currentChat = 'general';
let soundEnabled = true;
let darkMode = false;

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Загрузка мессенджера...');
    
    // Проверяем авторизацию
    await checkAuthStatus();
    
    // Инициализируем интерфейс
    initializeInterface();
    
    // Настраиваем обработчики
    setupEventListeners();
    
    // Загружаем сообщения
    await loadMessages();
    
    // Подписываемся на обновления
    subscribeToUpdates();
    
    console.log('Мессенджер загружен');
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
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        currentUser = null;
        updateUserInterface();
    }
}

// Обновление интерфейса пользователя
function updateUserInterface() {
    const userProfile = document.getElementById('userProfile');
    
    if (currentUser) {
        // Авторизованный пользователь
        userProfile.innerHTML = `
            <div class="user-avatar">
                <span>${currentUser.name.charAt(0).toUpperCase()}</span>
            </div>
            <div class="user-info">
                <div class="user-name">${currentUser.name}</div>
                <div class="user-status">В сети</div>
            </div>
            <button class="auth-btn" onclick="handleLogout()">Выйти</button>
        `;
        
        // Разблокируем ввод
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
    } else {
        // Гость
        userProfile.innerHTML = `
            <div class="user-avatar">
                <span class="avatar-placeholder">?</span>
            </div>
            <div class="user-info">
                <div class="user-name">Гость</div>
                <div class="user-status">Не в сети</div>
            </div>
            <button class="auth-btn" onclick="showAuthModal()">Войти</button>
        `;
        
        // Блокируем ввод
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendButton').disabled = true;
    }
}

// Инициализация интерфейса
function initializeInterface() {
    // Настраиваем навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            switchPage(page);
        });
    });
    
    // Настраиваем чаты
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function() {
            const chat = this.dataset.chat;
            switchChat(chat);
        });
    });
    
    // Обновляем онлайн пользователей
    loadOnlineUsers();
}

// Переключение страницы
function switchPage(page) {
    // Обновляем активную навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Здесь можно добавить логику переключения страниц
    console.log('Переключение на страницу:', page);
}

// Переключение чата
function switchChat(chatId) {
    currentChat = chatId;
    
    // Обновляем активный чат
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat="${chatId}"]`).classList.add('active');
    
    // Обновляем заголовок чата
    updateChatHeader(chatId);
    
    // Загружаем сообщения для этого чата
    loadMessages(chatId);
}

// Обновление заголовка чата
function updateChatHeader(chatId) {
    const chatNames = {
        'general': { title: 'Общий чат', subtitle: '12 участников • 5 в сети', avatar: '💬' },
        'travel': { title: 'Путешествия', subtitle: '8 участников • 3 в сети', avatar: '✈️' },
        'support': { title: 'Поддержка', subtitle: 'Онлайн 24/7', avatar: '🎯' }
    };
    
    const chat = chatNames[chatId];
    if (chat) {
        document.querySelector('.chat-title').textContent = chat.title;
        document.querySelector('.chat-subtitle').textContent = chat.subtitle;
        document.querySelector('.chat-avatar-large').textContent = chat.avatar;
    }
}

// Загрузка сообщений
async function loadMessages(chatId = 'general') {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(50);
            
        if (error) throw error;
        
        displayMessages(data || []);
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

// Отображение сообщений
function displayMessages(messages) {
    const messagesArea = document.getElementById('messagesArea');
    
    // Очищаем старые сообщения
    messagesArea.innerHTML = '';
    
    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🌍</div>
                <h3>Добро пожаловать в чат!</h3>
                <p>Начните общение с другими путешественниками</p>
            </div>
        `;
        return;
    }
    
    // Группируем сообщения по дате
    let lastDate = null;
    messages.forEach(message => {
        const messageDate = new Date(message.created_at).toDateString();
        
        if (messageDate !== lastDate) {
            const dateDivider = document.createElement('div');
            dateDivider.className = 'date-divider';
            dateDivider.innerHTML = `<span class="date-text">${formatDate(message.created_at)}</span>`;
            messagesArea.appendChild(dateDivider);
            lastDate = messageDate;
        }
        
        const messageElement = createMessageElement(message);
        messagesArea.appendChild(messageElement);
    });
    
    scrollToBottom();
}

// Создание элемента сообщения
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.user_id === currentUser?.id ? 'own-message' : 'other-message'}`;
    
    const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${message.user_name.charAt(0).toUpperCase()}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.user_name}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;
    
    return messageDiv;
}

// Отправка сообщения
async function sendMessage() {
    if (!currentUser) {
        showAuthModal();
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
                chat_id: currentChat,
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        input.value = '';
        autoResizeTextarea();
        
        // Воспроизводим звук
        if (soundEnabled) {
            playNotificationSound();
        }
        
        console.log('Сообщение отправлено:', data);
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
    }
}

// Подписка на обновления
function subscribeToUpdates() {
    // Подписка на сообщения
    messagesSubscription = supabase
        .channel('messenger_messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            },
            (payload) => {
                if (payload.new.chat_id === currentChat) {
                    addNewMessage(payload.new);
                    
                    // Воспроизводим звук для новых сообщений других пользователей
                    if (soundEnabled && payload.new.user_id !== currentUser?.id) {
                        playNotificationSound();
                    }
                }
            }
        )
        .subscribe();
    
    // Подписка на онлайн пользователей
    onlineUsersSubscription = supabase
        .channel('messenger_online_users')
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
    const messagesArea = document.getElementById('messagesArea');
    
    // Удаляем приветственное сообщение
    const welcomeMsg = messagesArea.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageElement = createMessageElement(message);
    messagesArea.appendChild(messageElement);
    
    scrollToBottom();
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
    } catch (error) {
        console.error('Ошибка загрузки онлайн пользователей:', error);
    }
}

// Отображение онлайн пользователей
function displayOnlineUsers(users) {
    const onlineUsersDiv = document.getElementById('onlineUsers');
    onlineUsersDiv.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'online-user';
        userDiv.innerHTML = `
            <div class="online-avatar">${user.user_name.charAt(0).toUpperCase()}</div>
            <div class="online-name">${user.user_name}</div>
            <div class="online-status online"></div>
        `;
        onlineUsersDiv.appendChild(userDiv);
    });
    
    if (users.length === 0) {
        onlineUsersDiv.innerHTML = '<div class="no-users">Никто онлайн</div>';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики форм авторизации
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
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
                
                closeAuthModal();
                await checkAuthStatus();
                
                // Обновляем онлайн статус
                if (currentUser) {
                    await updateOnlineStatus(true);
                }
                
            } catch (error) {
                console.error('Ошибка входа:', error);
                alert('Ошибка входа: ' + error.message);
            }
        });
    }
    
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
                closeAuthModal();
                
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }
    
    // Обработчик ввода сообщения
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', autoResizeTextarea);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !messageInput.disabled) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Настройки
    document.getElementById('soundNotifications').addEventListener('change', function() {
        soundEnabled = this.checked;
    });
    
    document.getElementById('darkMode').addEventListener('change', function() {
        darkMode = this.checked;
        document.body.classList.toggle('dark-theme', darkMode);
    });
}

// Модальные окна
function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    }
}

function toggleSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Функции чата
function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
}

function toggleVoiceCall() {
    alert('Голосовые вызовы будут доступны в следующем обновлении');
}

function toggleVideoCall() {
    alert('Видеозвонки будут доступны в следующем обновлении');
}

function toggleChatInfo() {
    alert('Информация о чате: 12 участников, 5 в сети');
}

function attachFile() {
    alert('Прикрепление файлов будет доступно в следующем обновлении');
}

function toggleEmojiPanel() {
    const emojiPanel = document.getElementById('emojiPanel');
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    
    toggleEmojiPanel();
    input.focus();
}

// Выход
async function handleLogout() {
    try {
        await updateOnlineStatus(false);
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        updateUserInterface();
        
        alert('Вы вышли из аккаунта');
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка выхода: ' + error.message);
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

// Вспомогательные функции
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesArea');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea() {
    const textarea = document.getElementById('messageInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Закрытие модальных окон по клику вне их
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
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

// Закрытие emoji панели по клику вне
document.addEventListener('click', function(e) {
    const emojiPanel = document.getElementById('emojiPanel');
    if (!emojiPanel.contains(e.target) && !e.target.classList.contains('emoji-btn')) {
        emojiPanel.style.display = 'none';
    }
});

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
