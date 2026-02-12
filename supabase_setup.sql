-- SQL для создания таблиц чата в Supabase

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица онлайн пользователей
CREATE TABLE IF NOT EXISTS online_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    user_name TEXT NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen DESC);

-- RLS (Row Level Security) политики
-- Для таблицы сообщений
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all messages" ON messages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Для таблицы онлайн пользователей
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view online users" ON online_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own online status" ON online_users
    FOR ALL USING (auth.uid() = user_id);

-- Функция для очистки старых онлайн пользователей
CREATE OR REPLACE FUNCTION cleanup_old_online_users()
RETURNS void AS $$
BEGIN
    DELETE FROM online_users 
    WHERE last_seen < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создание триггера для очистки (опционально)
-- CREATE OR REPLACE TRIGGER trigger_cleanup_online_users
--     AFTER INSERT OR UPDATE ON online_users
--     FOR EACH ROW EXECUTE FUNCTION cleanup_old_online_users();

-- Права для выполнения функции
GRANT EXECUTE ON FUNCTION cleanup_old_online_users TO authenticated;
