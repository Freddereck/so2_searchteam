'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi'; // Иконка отправки
import { io } from 'socket.io-client';

// Подключаемся к серверу WebSocket (замени адрес если сервер на другом хосте)
const socket = io('http://localhost:3001');

// Компонент чата
export default function Chat({ userId, partnerId, onMessageSent, partnerName }: { userId: number, partnerId: number, onMessageSent?: () => void, partnerName?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 20;
  const room = [userId, partnerId].sort().join('_'); // одинаковый для обоих
  const messagesEndRef = useRef(null);

  // Входим в комнату и слушаем новые сообщения
  useEffect(() => {
    setMessages([]);
    setSkip(0);
    setHasMore(true);
    loadMessages(0, true);
    socket.emit('join', room);
    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });
    return () => {
      socket.off('message');
      socket.emit('leave', room);
    };
  }, [room]);

  // Прокрутка вниз при новом сообщении
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Загружаем сообщения при открытии чата и автообновляем
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // автообновление раз в 3 сек
    return () => clearInterval(interval);
  }, [partnerId]);

  // Функция загрузки сообщений
  async function loadMessages(skipValue = skip, replace = false) {
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?user1=${userId}&user2=${partnerId}&limit=${limit}&skip=${skipValue}`);
      const data = await response.json();
      if (replace) {
        setMessages(data);
      } else {
        setMessages((prev) => [...data, ...prev]);
      }
      setHasMore(data.length === limit);
      
      // Считаем непрочитанные сообщения
      const unread = data.filter((m: any) => m.to_id === userId && !m.is_read);
      setUnreadCount(unread.length);
      
      // Если есть непрочитанные сообщения, отмечаем их как прочитанные
      if (unread.length > 0) {
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_ids: unread.map((m: any) => m._id)
          })
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleShowMore() {
    const newSkip = skip + limit;
    setSkip(newSkip);
    loadMessages(newSkip);
  }

  // Отправка сообщения
  async function sendMessage() {
    if (!newMessage.trim()) return;
    const messageData = {
      from_id: userId,
      to_id: partnerId,
      text: newMessage,
      created_at: new Date().toISOString(),
    };
    // Сохраняем в базу (API)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
    // Сразу добавляем сообщение в чат локально
    setMessages((prev) => [...prev, messageData]);
    // Отправляем через WebSocket
    socket.emit('message', room, messageData);
    setNewMessage('');
    if (onMessageSent) onMessageSent();
  }

  // Отправка по Enter
  function handleKeyDown(e: any) {
    if (e.key === 'Enter') sendMessage();
  }

  return (
    <div className="bg-black bg-opacity-60 rounded-xl p-4 w-full shadow-md neon-glow flex flex-col h-[400px] max-h-[70vh]">
      {/* Кнопка 'Показать ещё' */}
      {hasMore && (
        <button
          className="mb-2 text-purple-400 hover:text-white text-sm font-bold underline"
          onClick={handleShowMore}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}
      <div className="flex-1 mb-4 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-white">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400">Нет сообщений</div>
        ) : (
          messages.map((message, idx) => {
            const isMe = message.from_id === userId;
            return (
              <div key={message._id || idx} className={`mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] flex flex-col items-${isMe ? 'end' : 'start'}`}>
                  <div className="text-xs text-gray-400 mb-0.5">
                    {isMe ? 'Вы' : (partnerName || 'Собеседник')}
                  </div>
                  <div className={`inline-block px-3 py-2 rounded-lg text-sm font-medium break-words ${
                    isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                  }`}>
                    {message.text}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{new Date(message.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Форма отправки сообщения */}
      <div className="flex gap-2 items-center mt-auto">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          className="flex-1 p-2 rounded bg-gray-800 text-white text-base"
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full flex items-center justify-center transition active:scale-95"
          style={{ minWidth: 40, minHeight: 40 }}
        >
          <FiSend size={22} />
        </button>
      </div>
    </div>
  );
} 