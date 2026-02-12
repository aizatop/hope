// Инициализация Supabase
const supabaseUrl = 'https://eybvtbskxktwurotecjl.supabase.co';
const supabaseKey = 'sb_publishable_2fVufYc7abrhKrlZhy2ZJQ_nQqDR7f1';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;
let messagesSubscription = null;
let onlineUsersSubscription = null;

// Инициализация чата
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Чат загружается...');
    
    // Проверяем авторизацию
    const session = await checkSession();
    if (!session) {
        alert('Для доступа к чату необходимо войти в систему');
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = {
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        email: session.user.email
    };
    
    console.log('Текущий пользователь:', currentUser);
    
    // Инициализация чата
    await initializeChat();
});

// Проверка сессии
async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Ошибка проверки сессии:', error);
        return null;
    }
}

// Инициализация чата
async function initializeChat() {
    try {
        // Создаем таблицы если их нет
        await createTables();
        
        // Загружаем сообщения
        await loadMessages();
        
        // Подписываемся на обновления
        subscribeToMessages();
        subscribeToOnlineUsers();
        
        // Обновляем онлайн статус
        await updateOnlineStatus(true);
        
        // Обработчик отправки сообщений
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        console.log('Чат инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации чата:', error);
    }
}

// Создание таблиц в Supabase
async function createTables() {
    try {
        // Таблица сообщений
        const { error: messagesError } = await supabase.rpc('create_messages_table');
        if (messagesError && !messagesError.message.includes('already exists')) {
            console.error('Ошибка создания таблицы сообщений:', messagesError);
        }
        
        // Таблица онлайн пользователей
        const { error: onlineError } = await supabase.rpc('create_online_users_table');
        if (onlineError && !onlineError.message.includes('already exists')) {
            console.error('Ошибка создания таблицы онлайн пользователей:', onlineError);
        }
        
        console.log('Таблицы проверены');
    } catch (error) {
        console.error('Ошибка при создании таблиц:', error);
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
        updateMessageCount(data?.length || 0);
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

// Отображение сообщений
function displayMessages(messages) {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });
}

// Создание элемента сообщения
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.user_id === currentUser.id ? 'own-message' : 'other-message'}`;
    
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
        alert('Не удалось отправить сообщение');
    }
}

// Подписка на сообщения
function subscribeToMessages() {
    messagesSubscription = supabase
        .channel('messages')
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
        .channel('online_users')
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
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    
    scrollToBottom();
    updateMessageCount(messagesContainer.children.length);
}

// Загрузка онлайн пользователей
async function loadOnlineUsers() {
    try {
        const { data, error } = await supabase
            .from('online_users')
            .select('*')
            .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 минут
            
        if (error) throw error;
        
        displayOnlineUsers(data || []);
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
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateMessageCount(count) {
    document.getElementById('messageCount').textContent = `${count} сообщений`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Очистка при выходе
window.addEventListener('beforeunload', async function() {
    await updateOnlineStatus(false);
    
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
