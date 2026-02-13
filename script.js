// Инициализация Supabase
const supabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const supabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';

// Проверяем доступность Supabase
if (typeof window.supabase !== 'undefined') {
    var supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase клиент инициализирован');
    
    // Тестовая проверка соединения
    supabase.auth.getSession().then(({ data, error }) => {
        console.log('Тестовое соединение с Supabase:', { data, error });
    });
    
    // Слушаем изменения сессии
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Состояние авторизации изменилось:', event, session);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            console.log('Вызываем updateAuthButtons из-за изменения сессии');
            setTimeout(() => updateAuthButtons(), 100);
        }
    });
} else {
    console.error('Supabase библиотека не загружена');
}

// Глобальные функции для отладки
window.openLoginModal = function() {
    console.log('openLoginModal вызвана');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('Модальное окно входа открыто');
    } else {
        console.error('Модальное окно входа не найдено');
    }
}

window.openRegisterModal = function() {
    console.log('openRegisterModal вызвана');
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('Модальное окно регистрации открыто');
    } else {
        console.error('Модальное окно регистрации не найдено');
    }
}

window.closeModal = function(modalId) {
    console.log('closeModal вызвана с ID:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('Модальное окно закрыто:', modalId);
    } else {
        console.error('Модальное окно не найдено:', modalId);
    }
}

window.switchToRegister = function() {
    console.log('switchToRegister вызвана');
    closeModal('loginModal');
    openRegisterModal();
}

window.switchToLogin = function() {
    console.log('switchToLogin вызвана');
    closeModal('registerModal');
    openLoginModal();
}

// Функция открытия мессенджера
window.openMessenger = function() {
    console.log('Прокрутка к чату');
    const chatSection = document.getElementById('chat');
    if (chatSection) {
        chatSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


// JavaScript для интегрированного чата
const chatSupabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const chatSupabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';
const chatSupabase = window.supabase.createClient(chatSupabaseUrl, chatSupabaseKey);

// Глобальные переменные для чата
let chatCurrentUser = null;
let chatMessagesSubscription = null;
let chatOnlineUsersSubscription = null;
let chatMessageCount = 0;
let chatSoundEnabled = true;
let chatDarkTheme = false;
let chatCurrentChat = 'general';

// Инициализация чата при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeIntegratedChat();
});

// Инициализация интегрированного чата
function initializeIntegratedChat() {
    console.log('Инициализация интегрированного чата...');
    
    // Проверяем авторизацию
    checkChatAuthStatus();
    
    // Настраиваем обработчики
    setupChatEventListeners();
    
    // Загружаем сообщения
    loadChatMessages();
    
    // Подписываемся на обновления
    subscribeToChatUpdates();
    
    console.log('Интегрированный чат инициализирован');
}

// Проверка статуса авторизации для чата
async function checkChatAuthStatus() {
    try {
        const { data: { session }, error } = await chatSupabase.auth.getSession();
        
        if (error) {
            console.error('Ошибка проверки сессии чата:', error);
            chatCurrentUser = null;
        } else if (session && session.user) {
            chatCurrentUser = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                email: session.user.email
            };
            console.log('Пользователь чата авторизован:', chatCurrentUser);
        } else {
            chatCurrentUser = null;
            console.log('Пользователь чата не авторизован');
        }
        
        updateChatUserInterface();
    } catch (error) {
        console.error('Ошибка при проверке авторизации чата:', error);
        chatCurrentUser = null;
        updateChatUserInterface();
    }
}

// Обновление интерфейса пользователя чата
function updateChatUserInterface() {
    const userProfile = document.getElementById('chatUserProfile');
    const userStatusBar = document.getElementById('chatUserStatusBar');
    const messageInput = document.getElementById('chatMessageInput');
    const sendButton = document.getElementById('chatSendButton');
    const chatStatus = document.getElementById('chatStatus');
    
    if (chatCurrentUser) {
        // Авторизованный пользователь
        userProfile.innerHTML = `
            <div class="chat-user-avatar">
                <span>${chatCurrentUser.name.charAt(0).toUpperCase()}</span>
            </div>
            <div class="chat-user-info">
                <div class="chat-user-name">${chatCurrentUser.name}</div>
                <div class="chat-user-status">В сети</div>
            </div>
            <button class="chat-auth-btn" onclick="handleChatLogout()">Выйти</button>
        `;
        
        userStatusBar.innerHTML = `
            <span class="chat-status-indicator online"></span>
            <span class="chat-status-text">${chatCurrentUser.name}</span>
        `;
        
        messageInput.disabled = false;
        sendButton.disabled = false;
        chatStatus.textContent = 'Подключено к чату';
    } else {
        // Гость с возможностью чата
        const guestName = 'Гость' + Math.floor(Math.random() * 1000);
        
        userProfile.innerHTML = `
            <div class="chat-user-avatar">
                <span class="avatar-placeholder">?</span>
            </div>
            <div class="chat-user-info">
                <div class="chat-user-name">${guestName}</div>
                <div class="chat-user-status">Гость</div>
            </div>
            <button class="chat-auth-btn" onclick="showChatAuthModal()">Войти</button>
        `;
        
        userStatusBar.innerHTML = `
            <span class="chat-status-indicator online"></span>
            <span class="chat-status-text">${guestName}</span>
        `;
        
        messageInput.disabled = false;
        sendButton.disabled = false;
        chatStatus.textContent = 'Подключено к чату как гость';
        
        // Устанавливаем имя гостя для отправки сообщений
        window.chatGuestName = guestName;
    }
}

// Настройка обработчиков событий чата
function setupChatEventListeners() {
    // Обработчики форм авторизации
    const loginForm = document.getElementById('chatLoginForm');
    const registerForm = document.getElementById('chatRegisterForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('chatLoginEmail').value;
            const password = document.getElementById('chatLoginPassword').value;
            
            try {
                const { data, error } = await chatSupabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                closeChatAuthModal();
                await checkChatAuthStatus();
                
                // Обновляем онлайн статус
                if (chatCurrentUser) {
                    await updateChatOnlineStatus(true);
                }
                
            } catch (error) {
                console.error('Ошибка входа в чат:', error);
                alert('Ошибка входа: ' + error.message);
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('chatRegisterName').value;
            const email = document.getElementById('chatRegisterEmail').value;
            const password = document.getElementById('chatRegisterPassword').value;
            
            try {
                const { data, error } = await chatSupabase.auth.signUp({
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
                closeChatAuthModal();
                
            } catch (error) {
                console.error('Ошибка регистрации в чате:', error);
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }
    
    // Обработчики чатов
    document.querySelectorAll('.chat-chat-item').forEach(item => {
        item.addEventListener('click', function() {
            const chat = this.dataset.chat;
            switchChat(chat);
        });
    });
    
    // Обработчик ввода сообщения
    const messageInput = document.getElementById('chatMessageInput');
    messageInput.addEventListener('input', autoResizeChatTextarea);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !messageInput.disabled) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

// Переключение чата
function switchChat(chatId) {
    chatCurrentChat = chatId;
    
    // Обновляем активный чат
    document.querySelectorAll('.chat-chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat="${chatId}"]`).classList.add('active');
    
    // Обновляем заголовок чата
    updateChatHeader(chatId);
    
    // Загружаем сообщения для этого чата
    loadChatMessages(chatId);
}

// Обновление заголовка чата
function updateChatHeader(chatId) {
    const chatNames = {
        'general': { title: 'Общий чат', subtitle: '12 участников • 5 в сети', avatar: '💬' },
        'japan': { title: 'Япония', subtitle: '8 участников • 3 в сети', avatar: '🗼️' },
        'france': { title: 'Франция', subtitle: '6 участников • 2 в сети', avatar: '🗽' },
        'italy': { title: 'Италия', subtitle: '7 участников • 4 в сети', avatar: '🏛️' },
        'uk': { title: 'Великобритания', subtitle: '5 участников • 2 в сети', avatar: '🏰' }
    };
    
    const chat = chatNames[chatId];
    if (chat) {
        document.querySelector('.chat-title').textContent = chat.title;
        document.querySelector('.chat-subtitle').textContent = chat.subtitle;
        document.querySelector('.chat-avatar-large').textContent = chat.avatar;
    }
}

// Загрузка сообщений чата
async function loadChatMessages(chatId = 'general') {
    try {
        const { data, error } = await chatSupabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(50);
            
        if (error) throw error;
        
        displayChatMessages(data || []);
    } catch (error) {
        console.error('Ошибка загрузки сообщений чата:', error);
    }
}

// Отображение сообщений чата
function displayChatMessages(messages) {
    const messagesArea = document.getElementById('chatMessages');
    
    // Очищаем старые сообщения
    messagesArea.innerHTML = '';
    
    if (messages.length === 0) {
        const isGuest = !chatCurrentUser;
        messagesArea.innerHTML = `
            <div class="chat-welcome-message">
                <div class="chat-welcome-icon">🌍</div>
                <h3>Добро пожаловать в чат AliveAgain!</h3>
                <p>${isGuest ? 'Вы вошли как гость. Можете общаться без регистрации!' : 'Присоединяйтесь к общению с путешественниками со всего мира'}</p>
                <div class="chat-welcome-tips">
                    <p>💡 <strong>Советы:</strong></p>
                    <ul>
                        <li>${isGuest ? 'Вы общаетесь как гость. Для регистрации нажмите "Войти"' : 'Представьтесь, когда впервые заходите в чат'}</li>
                        <li>Расскажите о своих путешествиях</li>
                        <li>Задавайте вопросы о странах, которые интересуют</li>
                        <li>Будьте дружелюбны и открыты к общению</li>
                        ${isGuest ? '<li>Регистрация даст доступ к дополнительным функциям</li>' : ''}
                    </ul>
                </div>
                ${isGuest ? '<p style="margin-top: 1rem; color: #667eea;"><strong>💬 Начните общаться прямо сейчас!</strong></p>' : ''}
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
            dateDivider.innerHTML = `<span class="date-text">${formatChatDate(message.created_at)}</span>`;
            messagesArea.appendChild(dateDivider);
            lastDate = messageDate;
        }
        
        const messageElement = createChatMessageElement(message);
        messagesArea.appendChild(messageElement);
    });
    
    scrollToChatBottom();
}

// Создание элемента сообщения чата
function createChatMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.user_id === chatCurrentUser?.id ? 'own-message' : 'other-message'}`;
    
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
            <div class="message-text">${escapeChatHtml(message.text)}</div>
        </div>
    `;
    
    return messageDiv;
}

// Отправка сообщения чата
async function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        // Определяем данные пользователя (авторизованный или гость)
        let userId, userName;
        
        if (chatCurrentUser) {
            // Авторизованный пользователь
            userId = chatCurrentUser.id;
            userName = chatCurrentUser.name;
        } else {
            // Гость
            userId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            userName = window.chatGuestName || 'Гость';
        }
        
        const { data, error } = await chatSupabase
            .from('messages')
            .insert({
                user_id: userId,
                user_name: userName,
                text: text,
                chat_id: chatCurrentChat,
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        input.value = '';
        autoResizeChatTextarea();
        
        // Воспроизводим звук
        if (chatSoundEnabled) {
            playChatNotificationSound();
        }
        
        console.log('Сообщение чата отправлено:', data);
    } catch (error) {
        console.error('Ошибка отправки сообщения чата:', error);
    }
}

// Подписка на обновления чата
function subscribeToChatUpdates() {
    // Подписка на сообщения
    chatMessagesSubscription = chatSupabase
        .channel('integrated_chat_messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            },
            (payload) => {
                if (payload.new.chat_id === chatCurrentChat) {
                    addNewChatMessage(payload.new);
                    
                    // Воспроизводим звук для новых сообщений других пользователей
                    if (chatSoundEnabled && payload.new.user_id !== chatCurrentUser?.id) {
                        playChatNotificationSound();
                    }
                }
            }
        )
        .subscribe();
    
    // Подписка на онлайн пользователей
    chatOnlineUsersSubscription = chatSupabase
        .channel('integrated_online_users')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'online_users'
            },
            () => {
                loadChatOnlineUsers();
            }
        )
        .subscribe();
}

// Добавление нового сообщения чата
function addNewChatMessage(message) {
    const messagesArea = document.getElementById('chatMessages');
    
    // Удаляем приветственное сообщение
    const welcomeMsg = messagesArea.querySelector('.chat-welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageElement = createChatMessageElement(message);
    messagesArea.appendChild(messageElement);
    
    scrollToChatBottom();
    chatMessageCount++;
    updateChatMessageCount();
}

// Загрузка онлайн пользователей чата
async function loadChatOnlineUsers() {
    try {
        const { data, error } = await chatSupabase
            .from('online_users')
            .select('*')
            .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
            
        if (error) throw error;
        
        displayChatOnlineUsers(data || []);
        updateChatOnlineCount(data?.length || 0);
    } catch (error) {
        console.error('Ошибка загрузки онлайн пользователей чата:', error);
    }
}

// Отображение онлайн пользователей чата
function displayChatOnlineUsers(users) {
    const onlineUsersDiv = document.getElementById('chatOnlineUsers');
    onlineUsersDiv.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-online-user';
        userDiv.innerHTML = `
            <div class="online-avatar">${user.user_name.charAt(0).toUpperCase()}</div>
            <div class="online-name">${user.user_name}</div>
            <div class="online-status online"></div>
        `;
        onlineUsersDiv.appendChild(userDiv);
    });
    
    if (users.length === 0) {
        onlineUsersDiv.innerHTML = '<div class="loading-users">Никто онлайн</div>';
    }
}

// Модальные окна чата
function showChatAuthModal() {
    document.getElementById('chatAuthModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeChatAuthModal() {
    document.getElementById('chatAuthModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchChatAuthTab(tab) {
    const loginForm = document.getElementById('chatLoginForm');
    const registerForm = document.getElementById('chatRegisterForm');
    const tabBtns = document.querySelectorAll('.chat-tab-btn');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchChatAuthTab('${tab}')"]`).classList.add('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    }
}

// Дополнительные функции чата
function toggleChatSearch() {
    alert('Поиск по сообщениям будет доступен в следующем обновлении');
}

function toggleChatTheme() {
    chatDarkTheme = !chatDarkTheme;
    document.body.classList.toggle('dark-theme', chatDarkTheme);
    
    const themeIcon = document.getElementById('chatThemeIcon');
    themeIcon.textContent = chatDarkTheme ? '☀️' : '🌙';
}

function toggleChatSound() {
    chatSoundEnabled = !chatSoundEnabled;
    
    const soundIcon = document.getElementById('chatSoundIcon');
    soundIcon.textContent = chatSoundEnabled ? '🔊' : '🔇';
}

function attachChatFile() {
    alert('Прикрепление файлов будет доступно в следующем обновлении');
}

function toggleChatEmojiPanel() {
    const emojiPanel = document.getElementById('chatEmojiPanel');
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
}

function insertChatEmoji(emoji) {
    const input = document.getElementById('chatMessageInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    
    toggleChatEmojiPanel();
    input.focus();
}

// Выход из чата
async function handleChatLogout() {
    try {
        await updateChatOnlineStatus(false);
        
        const { error } = await chatSupabase.auth.signOut();
        if (error) throw error;
        
        chatCurrentUser = null;
        updateChatUserInterface();
        
        alert('Вы вышли из аккаунта');
    } catch (error) {
        console.error('Ошибка выхода из чата:', error);
        alert('Ошибка выхода: ' + error.message);
    }
}

// Обновление онлайн статуса чата
async function updateChatOnlineStatus(isOnline) {
    if (!chatCurrentUser && !window.chatGuestName) return;
    
    try {
        let userId, userName;
        
        if (chatCurrentUser) {
            // Авторизованный пользователь
            userId = chatCurrentUser.id;
            userName = chatCurrentUser.name;
        } else {
            // Гость
            userId = 'guest_' + window.chatGuestName;
            userName = window.chatGuestName;
        }
        
        if (isOnline) {
            await chatSupabase
                .from('online_users')
                .upsert({
                    user_id: userId,
                    user_name: userName,
                    last_seen: new Date().toISOString()
                });
        } else {
            await chatSupabase
                .from('online_users')
                .delete()
                .eq('user_id', userId);
        }
    } catch (error) {
        console.error('Ошибка обновления онлайн статуса чата:', error);
    }
}

// Вспомогательные функции чата
function scrollToChatBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeChatTextarea() {
    const textarea = document.getElementById('chatMessageInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function formatChatDate(dateString) {
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

function escapeChatHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playChatNotificationSound() {
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

function updateChatMessageCount() {
    const countElement = document.getElementById('chatMessageCount');
    if (countElement) {
        countElement.textContent = chatMessageCount;
    }
}

function updateChatOnlineCount(count) {
    const countElement = document.getElementById('chatOnlineCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Закрытие модальных окон по клику вне их
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('chat-modal-overlay')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.chat-modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        
        // Закрыть панель эмодзи
        const emojiPanel = document.getElementById('chatEmojiPanel');
        if (emojiPanel.style.display === 'block') {
            emojiPanel.style.display = 'none';
        }
    }
});

// Закрытие emoji панели по клику вне
document.addEventListener('click', function(e) {
    const emojiPanel = document.getElementById('chatEmojiPanel');
    if (!emojiPanel.contains(e.target) && !e.target.classList.contains('chat-emoji-btn')) {
        emojiPanel.style.display = 'none';
    }
});

// Очистка при выходе
window.addEventListener('beforeunload', async function() {
    if (chatCurrentUser) {
        await updateChatOnlineStatus(false);
    }
    
    if (chatMessagesSubscription) {
        chatSupabase.removeChannel(chatMessagesSubscription);
    }
    
    if (chatOnlineUsersSubscription) {
        chatSupabase.removeChannel(chatOnlineUsersSubscription);
    }
});

// Периодическое обновление онлайн статуса
setInterval(async function() {
    if (chatCurrentUser || window.chatGuestName) {
        await updateChatOnlineStatus(true);
    }
}, 60000); // Каждую минуту

// Функция прокрутки к странам
window.scrollToCountries = function() {
    console.log('Прокрутка к странам');
    const countriesSection = document.querySelector('.countries-grid');
    if (countriesSection) {
        countriesSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Регистрация пользователя - оптимизированная версия с таймаутами
async function registerUser(name, email, password) {
    const startTime = Date.now();
    const TIMEOUT = 15000; // 15 секунд таймаут
    
    try {
        console.log('Начало регистрации пользователя...');
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        // Создаем Promise с таймаутом
        const signUpPromise = supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                },
                emailRedirectTo: window.location.origin
            }
        });
        
        // Добавляем таймаут
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Превышено время ожидания. Попробуйте еще раз.')), TIMEOUT);
        });
        
        // Ждем результат или таймаут
        const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);

        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        if (error) {
            console.error('Ошибка регистрации:', error);
            
            // Обработка конкретных ошибок
            if (error.message.includes('User already registered')) {
                return { 
                    success: false, 
                    error: 'Пользователь с таким email уже существует. Попробуйте войти.' 
                };
            } else if (error.message.includes('Password should be')) {
                return { 
                    success: false, 
                    error: 'Пароль должен содержать минимум 6 символов.' 
                };
            } else if (error.message.includes('Invalid email')) {
                return { 
                    success: false, 
                    error: 'Введите корректный email адрес.' 
                };
            } else if (error.message.includes('timeout') || error.message.includes('Таймаут')) {
                return { 
                    success: false, 
                    error: 'Сервер долго отвечает. Попробуйте еще раз через несколько секунд.' 
                };
            } else {
                return { 
                    success: false, 
                    error: error.message 
                };
            }
        }

        const endTime = Date.now();
        console.log(`Регистрация выполнена за ${endTime - startTime}мс:`, data);

        // Если пользователь создан и сессия активна (email подтверждение не требуется)
        if (data.user && !data.user.email_confirmed_at) {
            return { 
                success: true, 
                message: 'Регистрация успешна! Проверьте email для подтверждения.',
                requiresConfirmation: true
            };
        } else if (data.session) {
            // Мгновенный вход без подтверждения email
            return { 
                success: true, 
                message: 'Регистрация выполнена успешно!',
                instantLogin: true,
                session: data.session
            };
        }

        return { success: true, message: 'Регистрация успешна!' };
        
    } catch (error) {
        console.error('Неожиданная ошибка регистрации:', error);
        
        // Восстанавливаем кнопку в случае ошибки
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Зарегистрироваться';
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
        
        if (error.message.includes('timeout') || error.message.includes('Таймаут')) {
            return { 
                success: false, 
                error: 'Сервер долго отвечает. Проверьте интернет-соединение и попробуйте еще раз.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Произошла ошибка при регистрации. Попробуйте еще раз.' 
        };
    }
}

// Вход пользователя
async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Ошибка входа:', error);
        return { success: false, error: error.message };
    }
}

// Выход пользователя
async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        return { success: true };
    } catch (error) {
        console.error('Ошибка выхода:', error);
        return { success: false, error: error.message };
    }
}

// Проверка текущей сессии
window.checkSession = async function() {
    console.log('=== checkSession вызвана ===');
    
    try {
        console.log('Проверяем сессию Supabase...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Результат getSession:', { session, error });
        
        if (error) {
            console.error('Ошибка getSession:', error);
            throw error;
        }
        
        if (session && session.user) {
            console.log('Сессия активна:', session.user.email);
            console.log('User metadata:', session.user.user_metadata);
        } else {
            console.log('Активной сессии нет');
        }
        
        return session;
    } catch (error) {
        console.error('Ошибка проверки сессии:', error);
        return null;
    }
}

// Обновленная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация обработчиков');
    
    // Проверяем наличие элементов
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const authButtons = document.querySelector('.auth-buttons');
    
    console.log('Форма регистрации:', registerForm);
    console.log('Форма входа:', loginForm);
    console.log('Кнопки авторизации:', authButtons);
    
    // Форма регистрации
    if (registerForm) {
        // Валидация в реальном времени
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        
        // Валидация имени
        nameInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value.length < 2) {
                this.setCustomValidity('Имя должно содержать минимум 2 символа');
            } else if (value.length > 50) {
                this.setCustomValidity('Имя не должно превышать 50 символов');
            } else {
                this.setCustomValidity('');
            }
        });
        
        // Валидация email
        emailInput.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.value)) {
                this.setCustomValidity('Введите корректный email адрес');
            } else {
                this.setCustomValidity('');
            }
        });
        
        // Валидация пароля
        passwordInput.addEventListener('input', function() {
            const value = this.value;
            if (value.length < 6) {
                this.setCustomValidity('Пароль должен содержать минимум 6 символов');
            } else if (value.length > 100) {
                this.setCustomValidity('Пароль не должен превышать 100 символов');
            } else {
                this.setCustomValidity('');
            }
        });
        
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Дополнительная клиентская валидация
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            
            // Проверяем еще раз на всякий случай
            if (name.length < 2 || name.length > 50) {
                alert('Имя должно содержать от 2 до 50 символов');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Введите корректный email адрес');
                return;
            }
            
            if (password.length < 6 || password.length > 100) {
                alert('Пароль должен содержать от 6 до 100 символов');
                return;
            }
            
            console.log('Данные регистрации:', { name, email });
            
            const result = await registerUser(name, email, password);
            
            if (result.success) {
                if (result.instantLogin) {
                    // Мгновенный вход
                    alert('Регистрация и вход выполнены успешно!');
                                        registerForm.reset();
                    
                    // Обновляем интерфейс сразу
                    setTimeout(async () => {
                        await updateAuthButtons();
                    }, 500);
                } else if (result.requiresConfirmation) {
                    // Требуется подтверждение email
                    alert(result.message);
                    registerForm.reset();
                    
                    // Показываем предложение войти после подтверждения
                    setTimeout(() => {
                        if (confirm('Email отправлен! Хотите войти после подтверждения?')) {
                            openLoginModal();
                        }
                    }, 1000);
                } else {
                    // Стандартная успешная регистрация
                    alert(result.message);
                                        registerForm.reset();
                    
                    setTimeout(async () => {
                        await updateAuthButtons();
                    }, 1000);
                }
            } else {
                alert('Ошибка регистрации: ' + result.error);
            }
        });
    } else {
        console.error('Форма регистрации не найдена');
    }
    
    // Форма входа
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Отправка формы входа');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            console.log('Данные входа:', { email });
            
            const result = await loginUser(email, password);
            
            if (result.success) {
                alert('Вход выполнен успешно!');
                                loginForm.reset();
                
                console.log('Вход успешен, обновляем кнопки...');
                // Обновляем кнопки после входа
                setTimeout(async () => {
                    await updateAuthButtons();
                }, 500);
            } else {
                alert('Ошибка входа: ' + result.error);
            }
        });
    } else {
        console.error('Форма входа не найдена');
    }
    
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
        }
    });
});



// Модальное окно для видео
function createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="video-container">
                <iframe id="video-frame" src="" allowfullscreen></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
        
    return modal;
}

// Открытие видео
function openVideo(videoUrl) {
    let modal = document.querySelector('.modal');
    if (!modal) {
        modal = createModal();
    }
    
    const videoFrame = document.getElementById('video-frame');
    
    // Преобразование YouTube URL в embed формат
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.split('/').pop().split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(videoUrl.split('?')[1]);
        const videoId = urlParams.get('v');
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    
    videoFrame.src = embedUrl;
    modal.style.display = 'flex';
    
    // Предотвращение прокрутки фона
    document.body.style.overflow = 'hidden';
}


// Анимация появления карточек при прокрутке
function animateOnScroll() {
    const cards = document.querySelectorAll('.country-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Плавная прокрутка к якорям
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Параллакс эффект для header
function initParallax() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        
        if (scrolled < header.offsetHeight) {
            header.style.transform = `translateY(${parallax}px)`;
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    animateOnScroll();
    initSmoothScroll();
    initParallax();
    
    // Добавление hover эффектов для карточек
    const cards = document.querySelectorAll('.country-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Анимация для заголовка
    const title = document.querySelector('.title');
    const subtitle = document.querySelector('.subtitle');
    
    if (title) {
        title.style.opacity = '0';
        title.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            title.style.transition = 'opacity 1s ease, transform 1s ease';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 100);
    }
    
    if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            subtitle.style.transition = 'opacity 1s ease, transform 1s ease';
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, 300);
    }
});

// Обработка ошибок загрузки изображений
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.country-image img');
    
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'https://picsum.photos/seed/travel/600/400.jpg';
        });
    });
});

// Добавление интерактивности для списка достопримечательностей
document.addEventListener('DOMContentLoaded', function() {
    const attractionItems = document.querySelectorAll('.attractions li');
    
    attractionItems.forEach(item => {
        item.addEventListener('click', function() {
            // Анимация при клике
            this.style.transform = 'scale(1.05)';
            this.style.color = '#E6B3B3';
            
            setTimeout(() => {
                this.style.transform = 'scale(1)';
                this.style.color = '';
            }, 200);
        });
    });
});

// Оптимизация производительности - debounce для scroll событий
function debounce(func, wait) {
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

// Применение debounce к parallax функции
const debouncedParallax = debounce(initParallax, 10);
window.addEventListener('scroll', debouncedParallax);

// Анимация для секции проекта
function animateProjectSection() {
    const projectSection = document.querySelector('.project-section');
    if (!projectSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Анимация элементов внутри секции
                const featureItems = entry.target.querySelectorAll('.feature-item');
                featureItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 200 * index);
                });
                
                const missionBox = entry.target.querySelector('.mission-box');
                if (missionBox) {
                    setTimeout(() => {
                        missionBox.style.opacity = '1';
                        missionBox.style.transform = 'scale(1)';
                    }, 800);
                }
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
    });
    
    projectSection.style.opacity = '0';
    projectSection.style.transform = 'translateY(50px)';
    projectSection.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    
    const featureItems = projectSection.querySelectorAll('.feature-item');
    featureItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    const missionBox = projectSection.querySelector('.mission-box');
    if (missionBox) {
        missionBox.style.opacity = '0';
        missionBox.style.transform = 'scale(0.9)';
        missionBox.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    }
    
    observer.observe(projectSection);
}

// Интерактивность для статистики
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalText = target.textContent;
                
                // Анимация только для чисел
                if (finalText.includes('+')) {
                    const finalNumber = parseInt(finalText);
                    let currentNumber = 0;
                    const increment = finalNumber / 50;
                    
                    const updateNumber = () => {
                        currentNumber += increment;
                        if (currentNumber < finalNumber) {
                            target.textContent = Math.floor(currentNumber) + '+';
                            requestAnimationFrame(updateNumber);
                        } else {
                            target.textContent = finalText;
                        }
                    };
                    
                    updateNumber();
                }
                
                observer.unobserve(target);
            }
        });
    }, {
        threshold: 0.8
    });
    
    statNumbers.forEach(stat => observer.observe(stat));
}

// Интерактивность для feature items
function initFeatureInteractions() {
    const featureItems = document.querySelectorAll('.feature-item');
    
    featureItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.feature-icon');
            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(5deg)';
                icon.style.transition = 'transform 0.3s ease';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.feature-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
        
        item.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Анимация для hero секции
function animateHeroSection() {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCall = document.querySelector('.hero-call');
    const heroDescription = document.querySelector('.hero-description');
    const heroFeatures = document.querySelectorAll('.hero-feature');
    
    // Начальные состояния
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(-50px)';
    }
    
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(-30px)';
    }
    
    if (heroCall) {
        heroCall.style.opacity = '0';
        heroCall.style.transform = 'translateX(-50px)';
    }
    
    if (heroDescription) {
        heroDescription.style.opacity = '0';
        heroDescription.style.transform = 'translateX(50px)';
    }
    
    heroFeatures.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(30px)';
    });
    
    // Анимация появления
    setTimeout(() => {
        if (heroTitle) {
            heroTitle.style.transition = 'opacity 1s ease, transform 1s ease';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }
    }, 300);
    
    setTimeout(() => {
        if (heroSubtitle) {
            heroSubtitle.style.transition = 'opacity 1s ease, transform 1s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }
    }, 600);
    
    setTimeout(() => {
        if (heroCall) {
            heroCall.style.transition = 'opacity 1s ease, transform 1s ease';
            heroCall.style.opacity = '1';
            heroCall.style.transform = 'translateX(0)';
        }
    }, 900);
    
    setTimeout(() => {
        if (heroDescription) {
            heroDescription.style.transition = 'opacity 1s ease, transform 1s ease';
            heroDescription.style.opacity = '1';
            heroDescription.style.transform = 'translateX(0)';
        }
    }, 1200);
    
    heroFeatures.forEach((feature, index) => {
        setTimeout(() => {
            feature.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            feature.style.opacity = '1';
            feature.style.transform = 'translateY(0)';
        }, 1500 + index * 200);
    });
}

// Обновление кнопок авторизации
window.updateAuthButtons = async function() {
    console.log('=== updateAuthButtons вызвана ===');
    
    try {
        const session = await checkSession();
        const authButtons = document.querySelector('.auth-buttons');
        
        console.log('Сессия:', session);
        console.log('Кнопки авторизации элемент:', authButtons);
        
        if (!authButtons) {
            console.error('Элемент .auth-buttons не найден!');
            return;
        }
        
        if (session && session.user) {
            const userName = session.user.user_metadata?.name || 
                           session.user.email?.split('@')[0] || 
                           'Пользователь';
            
            console.log('Имя пользователя:', userName);
            console.log('Email пользователя:', session.user.email);
            console.log('Metadata:', session.user.user_metadata);
            
            authButtons.innerHTML = `
                <span class="user-info">Привет, ${userName}!</span>
                <button class="auth-btn messenger-btn" onclick="openMessenger()">💬 Мессенджер</button>
                <button class="auth-btn logout-btn" onclick="handleLogout()">Выйти</button>
            `;
            
            console.log('Кнопки обновлены для авторизованного пользователя');
            console.log('HTML после обновления:', authButtons.innerHTML);
        } else {
            console.log('Пользователь не авторизован, показываем кнопки входа');
            
            authButtons.innerHTML = `
                <button class="auth-btn login-btn" onclick="openLoginModal()">Войти</button>
                <button class="auth-btn register-btn" onclick="openRegisterModal()">Регистрация</button>
                <button class="auth-btn messenger-btn" onclick="openMessenger()">💬 Мессенджер</button>
            `;
            
            console.log('Кнопки обновлены для неавторизованного пользователя');
        }
    } catch (error) {
        console.error('Ошибка в updateAuthButtons:', error);
    }
}

// Обработчик выхода
window.handleLogout = async function() {
    console.log('handleLogout вызвана');
    const result = await logoutUser();
    if (result.success) {
        console.log('Выход успешен');
        // Сначала обновляем кнопки, затем перезагружаем страницу
        updateAuthButtons();
        setTimeout(() => {
            location.reload();
        }, 500);
    } else {
        alert('Ошибка выхода: ' + result.error);
    }
}

// Обновленная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем сессию при загрузке
    updateAuthButtons();
    
    // Проверяем наличие элементов
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const authButtons = document.querySelector('.auth-buttons');
    
    console.log('Форма регистрации:', registerForm);
    console.log('Форма входа:', loginForm);
    console.log('Кнопки авторизации:', authButtons);
    
    // Форма регистрации
    if (registerForm) {
        // Валидация в реальном времени
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        
        // Валидация имени
        nameInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value.length < 2) {
                this.setCustomValidity('Имя должно содержать минимум 2 символа');
            } else if (value.length > 50) {
                this.setCustomValidity('Имя не должно превышать 50 символов');
            } else {
                this.setCustomValidity('');
            }
        });
        
        // Валидация email
        emailInput.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.value)) {
                this.setCustomValidity('Введите корректный email адрес');
            } else {
                this.setCustomValidity('');
            }
        });
        
        // Валидация пароля
        passwordInput.addEventListener('input', function() {
            const value = this.value;
            if (value.length < 6) {
                this.setCustomValidity('Пароль должен содержать минимум 6 символов');
            } else if (value.length > 100) {
                this.setCustomValidity('Пароль не должен превышать 100 символов');
            } else {
                this.setCustomValidity('');
            }
        });
        
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Дополнительная клиентская валидация
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            
            // Проверяем еще раз на всякий случай
            if (name.length < 2 || name.length > 50) {
                alert('Имя должно содержать от 2 до 50 символов');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Введите корректный email адрес');
                return;
            }
            
            if (password.length < 6 || password.length > 100) {
                alert('Пароль должен содержать от 6 до 100 символов');
                return;
            }
            
            console.log('Данные регистрации:', { name, email });
            
            const result = await registerUser(name, email, password);
            
            if (result.success) {
                if (result.instantLogin) {
                    // Мгновенный вход
                    alert('Регистрация и вход выполнены успешно!');
                    closeModal('registerModal');
                    registerForm.reset();
                    
                    // Обновляем интерфейс сразу
                    setTimeout(async () => {
                        await updateAuthButtons();
                    }, 500);
                } else if (result.requiresConfirmation) {
                    // Требуется подтверждение email
                    alert(result.message);
                    closeModal('registerModal');
                    registerForm.reset();
                    
                    // Показываем предложение войти после подтверждения
                    setTimeout(() => {
                        if (confirm('Email отправлен! Хотите войти после подтверждения?')) {
                            openLoginModal();
                        }
                    }, 1000);
                } else {
                    // Стандартная успешная регистрация
                    alert(result.message);
                    closeModal('registerModal');
                    registerForm.reset();
                    
                    setTimeout(async () => {
                        await updateAuthButtons();
                    }, 1000);
                }
            } else {
                alert('Ошибка регистрации: ' + result.error);
            }
        });
    } else {
        console.error('Форма регистрации не найдена');
    }
    
    // Форма входа
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Отправка формы входа');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            console.log('Данные входа:', { email });
            
            const result = await loginUser(email, password);
            
            if (result.success) {
                alert('Вход выполнен успешно!');
                closeModal('loginModal');
                loginForm.reset();
                
                console.log('Вход успешен, обновляем кнопки...');
                // Обновляем кнопки после входа
                setTimeout(async () => {
                    await updateAuthButtons();
                }, 500);
            } else {
                alert('Ошибка входа: ' + result.error);
            }
        });
    } else {
        console.error('Форма входа не найдена');
    }
    
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
        }
    });
    
    animateHeroSection();
    animateOnScroll();
    initSmoothScroll();
    initParallax();
    animateProjectSection();
    animateStats();
    initFeatureInteractions();
    
    // Добавление hover эффектов для карточек
    const cards = document.querySelectorAll('.country-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Анимация для заголовка
    const title = document.querySelector('.title');
    const subtitle = document.querySelector('.subtitle');
    
    if (title) {
        title.style.opacity = '0';
        title.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            title.style.transition = 'opacity 1s ease, transform 1s ease';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 100);
    }
    
    if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            subtitle.style.transition = 'opacity 1s ease, transform 1s ease';
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, 300);
    }
});
