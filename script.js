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

// Функция открытия отдельной страницы чата
window.openStandaloneChat = function() {
    console.log('Открытие отдельной страницы чата');
    window.open('chat-standalone.html', '_blank');
}

// Функция открытия публичного чата
window.openPublicChat = function() {
    console.log('Открытие публичного чата');
    window.open('public-chat.html', '_blank');
}

// Функция открытия чата зарегистрированных пользователей
window.openChat = function() {
    console.log('Открытие чата');
    window.open('chat.html', '_blank');
}

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
    
    // Сначала обновляем кнопки авторизации
    console.log('Вызов updateAuthButtons при загрузке');
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
});

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
                <button class="auth-btn chat-btn" onclick="openChat()">💬 Чат</button>
                <button class="auth-btn logout-btn" onclick="handleLogout()">Выйти</button>
            `;
            
            console.log('Кнопки обновлены для авторизованного пользователя');
            console.log('HTML после обновления:', authButtons.innerHTML);
        } else {
            console.log('Пользователь не авторизован, показываем кнопки входа');
            
            authButtons.innerHTML = `
                <button class="auth-btn login-btn" onclick="openLoginModal()">Войти</button>
                <button class="auth-btn register-btn" onclick="openRegisterModal()">Регистрация</button>
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
    
    // Закрытие модального окна
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
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

// Закрытие модального окна
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        const videoFrame = document.getElementById('video-frame');
        videoFrame.src = '';
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Закрытие модального окна по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

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

// Обновленная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    updateAuthButtons(); // Проверяем сессию при загрузке
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
