'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Chat from '../components/Chat';

export default function Messages() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.ready();
      const userData = WebApp.initDataUnsafe.user;
      if (userData) {
        setUser(userData);
        // Получаем данные пользователя
        fetch(`/api/users?user_id=${userData.id}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.useMessenger) {
              loadConversations(userData.id);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadConversations(userId: number) {
    try {
      // Получаем все сообщения пользователя
      const response = await fetch(`/api/messages?from_id=${userId}&to_id=${userId}`);
      const messages = await response.json();
      
      // Собираем уникальные ID собеседников
      const partnerIds = new Set();
      messages.forEach((msg: any) => {
        if (msg.from_id !== userId) partnerIds.add(msg.from_id);
        if (msg.to_id !== userId) partnerIds.add(msg.to_id);
      });
      
      // Получаем информацию о собеседниках
      const usersResponse = await fetch(`/api/users?ids=${Array.from(partnerIds).join(',')}`);
      const usersData = await usersResponse.json();
      setUsers(usersData);
      
      // Формируем список диалогов
      const convs = Array.from(partnerIds).map((partnerId: any) => {
        const partner = usersData.find((u: any) => u.user_id === partnerId);
        const lastMessage = messages
          .filter((m: any) => m.from_id === partnerId || m.to_id === partnerId)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        return {
          partner,
          lastMessage,
          unread: messages.filter((m: any) => m.from_id === partnerId && m.to_id === userId && !m.is_read).length
        };
      });
      
      setConversations(convs.sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      ));
    } catch (error) {
      console.error('Ошибка при загрузке диалогов:', error);
    }
  }

  function handleMessageSent() {
    if (user) loadConversations(user.id);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1a1333] to-[#2d1e4f]">
        <div className="loader mb-4"></div>
        <span className="text-white text-lg font-bold">Загрузка...</span>
        <style jsx global>{`
          .loader {
            border: 6px solid #eee;
            border-top: 6px solid #7f5fff;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1a1333] to-[#2d1e4f]">
        <p className="text-white bg-black bg-opacity-60 p-4 rounded-lg">Пожалуйста, откройте приложение через Telegram...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-[#1a1333] to-[#2d1e4f]">
      {/* Фоновое изображение с затемнением */}
      <div className="fixed inset-0 -z-10">
        <img src="/wallpaper.jpg" alt="wallpaper" className="w-full h-full object-cover blur-lg" />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Шапка с кнопкой "На главную" */}
      <div className="flex justify-between items-center w-full max-w-md mb-6">
        <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">Сообщения</h1>
        <Link href="/" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition">
          На главную
        </Link>
      </div>

      {/* Мобильная версия: только список или только чат */}
      {isMobile ? (
        <div className="w-full max-w-md">
          {!selectedUser ? (
            <div className="bg-black bg-opacity-60 rounded-xl p-4 shadow-md">
              <div className="space-y-2">
                {conversations.length === 0 && (
                  <div className="text-gray-400 text-center py-8">Нет переписок</div>
                )}
                {conversations.map((conv) => (
                  <div
                    key={conv.partner.user_id}
                    className={`p-2 rounded-lg cursor-pointer ${
                      selectedUser?.user_id === conv.partner.user_id
                        ? 'bg-purple-600'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedUser(conv.partner)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white">
                        {conv.partner.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-bold truncate">
                          {conv.partner.nickname}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {conv.lastMessage.text}
                        </div>
                      </div>
                      {conv.unread > 0 && (
                        <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-black bg-opacity-60 rounded-xl p-4 shadow-md">
              <button
                className="mb-4 text-purple-400 font-bold text-lg"
                onClick={() => setSelectedUser(null)}
              >
                ← Назад
              </button>
              <Chat userId={user.id} partnerId={selectedUser.user_id} onMessageSent={handleMessageSent} />
            </div>
          )}
        </div>
      ) : (
        // Десктопная версия: список и чат рядом
        <div className="w-full max-w-md flex gap-4">
          {/* Список диалогов */}
          <div className="w-1/3 bg-black bg-opacity-60 rounded-xl p-4 shadow-md">
            <div className="space-y-2">
              {conversations.length === 0 && (
                <div className="text-gray-400 text-center py-8">Нет переписок</div>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.partner.user_id}
                  className={`p-2 rounded-lg cursor-pointer ${
                    selectedUser?.user_id === conv.partner.user_id
                      ? 'bg-purple-600'
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedUser(conv.partner)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white">
                      {conv.partner.nickname?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-bold truncate">
                        {conv.partner.nickname}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        {conv.lastMessage.text}
                      </div>
                    </div>
                    {conv.unread > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Чат */}
          <div className="flex-1">
            {selectedUser ? (
              <Chat userId={user.id} partnerId={selectedUser.user_id} onMessageSent={handleMessageSent} />
            ) : (
              <div className="bg-black bg-opacity-60 rounded-xl p-4 shadow-md h-full flex items-center justify-center">
                <p className="text-gray-400">Выберите диалог</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
} 