// Инициализация Supabase
const supabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const supabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;
let messagesSubscription = null;
let onlineUsersSubscription = null;
let messageCount = 0;

// Инициализация чата
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Публичный чат загружается...');
    
    // Проверяем авторизацию
    await checkAuthStatus();
    
    // Инициализация чата
    await initializeChat();
    
    // Настраиваем обработчики форм
    setupFormHandlers();
    
    console.log('Публичный чат инициализирован');
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
    const currentUserDiv = document.getElementById('currentUser');
    const authButton = document.getElementById('authButton');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const guestNotice = document.getElementById('guestNotice');
    const loginPrompt = document.querySelector('.login-prompt');
    
    if (currentUser) {
        // Авторизованный пользователь
        currentUserDiv.innerHTML = `
            <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <span class="user-name">${currentUser.name}</span>
                <span class="user-status-text">В сети</span>
            </div>
        `;
        
        authButton.textContent = 'Выйти';
        authButton.onclick = handleLogout;
        
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        if (guestNotice) guestNotice.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'none';
        
    } else {
        // Гость
        currentUserDiv.innerHTML = `
            <div class="user-avatar">?</div>
            <div class="user-info">
                <span class="user-name">Гость</span>
                <span class="user-status-text">Не авторизован</span>
            </div>
        `;
        
        authButton.textContent = 'Войти';
        authButton.onclick = showLoginModal;
        
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        if (guestNotice) guestNotice.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'block';
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
        
        // Обработчик ввода
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey && !messageInput.disabled) {
                e.preventDefault();
                sendMessage();
            }
        });
        
    } catch (error) {
        console.error('Ошибка инициализации чата:', error);
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
        console.log('Сообщение отправлено:', data);
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        displayErrorMessage('Не удалось отправить сообщение');
    }
}

// Подписка на сообщения
function subscribeToMessages() {
    messagesSubscription = supabase
        .channel('public_messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            },
            (payload) => {
                console.log('Новое сообщение:', payload.new);
                addNewMessage(payload.new);
            }
        )
        .subscribe();
}

// Подписка на онлайн пользователей
function subscribeToOnlineUsers() {
    onlineUsersSubscription = supabase
        .channel('public_online_users')
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
        usersList.innerHTML = '<div class="no-users">Никто онлайн</div>';
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

// Функции авторизации
function showLoginModal() {
    document.getElementById('quickLoginModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showRegisterModal() {
    document.getElementById('quickRegisterModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeQuickModal() {
    document.getElementById('quickLoginModal').style.display = 'none';
    document.getElementById('quickRegisterModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchToQuickRegister() {
    closeQuickModal();
    showRegisterModal();
}

function switchToQuickLogin() {
    closeQuickModal();
    showLoginModal();
}

function toggleAuth() {
    if (currentUser) {
        handleLogout();
    } else {
        showLoginModal();
    }
}

// Настройка обработчиков форм
function setupFormHandlers() {
    // Быстрый вход
    const quickLoginForm = document.getElementById('quickLoginForm');
    if (quickLoginForm) {
        quickLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('quickLoginEmail').value;
            const password = document.getElementById('quickLoginPassword').value;
            
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                alert('Вход выполнен успешно!');
                closeQuickModal();
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
    
    // Быстрая регистрация
    const quickRegisterForm = document.getElementById('quickRegisterForm');
    if (quickRegisterForm) {
        quickRegisterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('quickRegisterName').value;
            const email = document.getElementById('quickRegisterEmail').value;
            const password = document.getElementById('quickRegisterPassword').value;
            
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
                closeQuickModal();
                
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }
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
}, 60000);
