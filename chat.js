// Минималистичный чат функциональность
let messages = [];
let currentUser = 'Гость';

// Инициализация чата
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем сообщения из localStorage
    loadMessages();
    
    // Добавляем обработчик для Enter
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Прокручиваем чат вниз
    scrollToBottom();
});

// Функция отправки сообщения
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (messageText === '') {
        return;
    }
    
    // Создаем новое сообщение
    const newMessage = {
        author: currentUser,
        text: messageText,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        own: true
    };
    
    // Добавляем сообщение в массив
    messages.push(newMessage);
    
    // Отображаем сообщение
    displayMessage(newMessage);
    
    // Очищаем поле ввода
    messageInput.value = '';
    
    // Сохраняем в localStorage
    saveMessages();
    
    // Прокручиваем чат вниз
    scrollToBottom();
}

// Функция отображения сообщения
function displayMessage(message) {
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

// Функция сохранения сообщений
function saveMessages() {
    // Сохраняем только последние 50 сообщений
    const messagesToSave = messages.slice(-50);
    localStorage.setItem('aliveAgainChatMessages', JSON.stringify(messagesToSave));
}

// Функция загрузки сообщений
function loadMessages() {
    const savedMessages = localStorage.getItem('aliveAgainChatMessages');
    if (savedMessages) {
        messages = JSON.parse(savedMessages);
        
        // Отображаем сохраненные сообщения
        messages.forEach(message => {
            displayMessage(message);
        });
    }
}

// Функция прокрутки чата вниз
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
}
