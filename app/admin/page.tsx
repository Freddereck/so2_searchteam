'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const ADMIN_ID = 1250640778;
const ADMIN_KEY = '63217428';

function getIp() {
  return fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => data.ip)
    .catch(() => null);
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [key, setKey] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'all' | 'banned' | 'unbanned' | 'mmr-asc' | 'mmr-desc'>('all');
  const [ipChecked, setIpChecked] = useState(false);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [tab, setTab] = useState<'users' | 'appeals' | 'messages' | 'logs'>('users');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgPage, setMsgPage] = useState(0);
  const msgLimit = 50;

  useEffect(() => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.ready();
      const userData = WebApp.initDataUnsafe.user;
      if (userData) {
        setUser(userData);
        // Проверяем user_id
        if (userData.id !== ADMIN_ID) {
          setError('Нет доступа.');
        } else {
          // Проверяем ключ в URL
          const urlKey = searchParams.get('key');
          if (urlKey === ADMIN_KEY) {
            setIsAuth(true);
          }
        }
      } else {
        setError('Нет доступа.');
      }
    });
  }, []);

  // Проверка IP и localStorage
  useEffect(() => {
    getIp().then(ip => {
      if (ip && localStorage.getItem('admin_ip') === ip) {
        setIsAuth(true);
      }
      setIpChecked(true);
    });
  }, []);

  useEffect(() => {
    // Загружаем пользователей, если авторизован
    if (isAuth) {
      setLoadingUsers(true);
      fetch('/api/users?all=true')
        .then(res => res.json())
        .then(data => {
          setUsers(Array.isArray(data) ? data : []);
          setLoadingUsers(false);
        });
    }
  }, [isAuth]);

  // Загрузка апелляций
  useEffect(() => {
    if (isAuth) {
      setLoadingAppeals(true);
      fetch('/api/appeals')
        .then(res => res.json())
        .then(data => {
          setAppeals(Array.isArray(data) ? data : []);
          setLoadingAppeals(false);
        });
    }
  }, [isAuth]);

  // Загрузка сообщений
  useEffect(() => {
    if (isAuth) {
      fetch('/api/messages')
        .then(res => res.json())
        .then(data => {
          setMessages(Array.isArray(data) ? data : []);
        });
    }
  }, [isAuth]);

  // Загрузка всех сообщений для вкладки 'logs' с пагинацией
  useEffect(() => {
    if (isAuth && tab === 'logs') {
      setLoadingMessages(true);
      fetch(`/api/messages?limit=${msgLimit}&skip=${msgPage * msgLimit}`)
        .then(res => res.json())
        .then(data => {
          setMessages(Array.isArray(data) ? data : []);
          setLoadingMessages(false);
        });
    }
  }, [isAuth, tab, msgPage]);

  // Фильтрация по нику, ID, MMR
  let filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    return (
      u.nickname?.toLowerCase().includes(s) ||
      String(u.user_id).includes(s) ||
      String(u.mmr).includes(s)
    );
  });

  // Сортировка
  if (sort === 'banned') filteredUsers = filteredUsers.filter(u => u.is_banned);
  if (sort === 'unbanned') filteredUsers = filteredUsers.filter(u => !u.is_banned);
  if (sort === 'mmr-asc') filteredUsers = [...filteredUsers].sort((a, b) => a.mmr - b.mmr);
  if (sort === 'mmr-desc') filteredUsers = [...filteredUsers].sort((a, b) => b.mmr - a.mmr);

  function handleSubmit(e: any) {
    e.preventDefault();
    if (key === ADMIN_KEY) {
      setIsAuth(true);
      getIp().then(ip => {
        if (ip) localStorage.setItem('admin_ip', ip);
      });
    } else {
      setError('Неверный ключ!');
    }
  }

  async function handleBan(user_id: number, ban: boolean) {
    console.log('BAN PATCH', { user_id, is_banned: ban });
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, is_banned: ban })
    });
    setUsers(users => users.map(u => u.user_id === user_id ? { ...u, is_banned: ban } : u));
  }

  async function handleVerify(user_id: number, verify: boolean) {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, is_verified: verify })
    });
    setUsers(users => users.map(u => u.user_id === user_id ? { ...u, is_verified: verify } : u));
  }

  async function handleAppealStatus(id: string, status: string) {
    await fetch('/api/appeals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    setAppeals(appeals => appeals.map(a => a._id === id ? { ...a, status } : a));
  }

  async function handleUnban(user_id: number, appealId: string) {
    // Разбанить пользователя
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, is_banned: false })
    });
    setUsers(users => users.map(u => u.user_id === user_id ? { ...u, is_banned: false } : u));
    // Отметить апелляцию как reviewed
    await fetch('/api/appeals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appealId, status: 'reviewed' })
    });
    setAppeals(appeals => appeals.map(a => a._id === appealId ? { ...a, status: 'reviewed' } : a));
  }

  if (!ipChecked) {
    return <div className="min-h-screen flex items-center justify-center text-white font-bold">Проверка доступа...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1333] to-[#2d1e4f] p-4">
        <div className="bg-black bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col gap-4 w-full max-w-xs">
          <h2 className="text-xl font-bold text-white mb-2">Вход в админ-панель</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              className="p-3 rounded bg-gray-800 text-white text-lg"
              placeholder="Ключ доступа"
              value={key}
              onChange={e => setKey(e.target.value)}
            />
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition text-lg" type="submit">
              Войти
            </button>
            {error && <div className="text-red-400 text-sm font-bold">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  if (isAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#1a1333] to-[#2d1e4f] p-2">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-white">Админ-панель</h2>
            <a href="/" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-center active:scale-95 transition block">На главную</a>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Пользователи</button>
            <button onClick={() => setTab('appeals')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'appeals' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Апелляции</button>
            <button onClick={() => setTab('messages')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'messages' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}>История общений</button>
            <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'logs' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Сообщения</button>
          </div>
          {tab === 'users' && (
            <div className="bg-black bg-opacity-70 rounded-xl p-4 shadow-lg flex flex-col gap-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="text-white font-bold">Список пользователей</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSort('all')} className={`px-3 py-1 rounded-lg font-bold ${sort === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Все</button>
                  <button onClick={() => setSort('banned')} className={`px-3 py-1 rounded-lg font-bold ${sort === 'banned' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Забаненные</button>
                  <button onClick={() => setSort('unbanned')} className={`px-3 py-1 rounded-lg font-bold ${sort === 'unbanned' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Разбаненные</button>
                  <button onClick={() => setSort('mmr-asc')} className={`px-3 py-1 rounded-lg font-bold ${sort === 'mmr-asc' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-200'}`}>MMR ↑</button>
                  <button onClick={() => setSort('mmr-desc')} className={`px-3 py-1 rounded-lg font-bold ${sort === 'mmr-desc' ? 'bg-yellow-700 text-white' : 'bg-gray-700 text-gray-200'}`}>MMR ↓</button>
                </div>
              </div>
              <input
                type="text"
                className="mb-3 p-2 rounded bg-gray-800 text-white w-full max-w-xs"
                placeholder="Поиск по нику, ID, MMR"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {loadingUsers ? <div className="text-white">Загрузка...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-white min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="p-2">ID</th>
                        <th className="p-2">Ник</th>
                        <th className="p-2">MMR</th>
                        <th className="p-2">Бан</th>
                        <th className="p-2">Вериф.</th>
                        <th className="p-2">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.user_id} className={u.is_banned ? 'bg-red-900' : 'bg-gray-800'}>
                          <td className="p-2 break-all">{u.user_id}</td>
                          <td className="p-2 break-all">{u.nickname}</td>
                          <td className="p-2">{u.mmr}</td>
                          <td className="p-2">{u.is_banned ? 'Да' : 'Нет'}</td>
                          <td className="p-2">{u.is_verified ? 'Да' : 'Нет'}</td>
                          <td className="p-2 flex flex-col gap-2 min-w-[120px]">
                            <button onClick={() => handleBan(u.user_id, !u.is_banned)} className={`w-full ${u.is_banned ? 'bg-green-600' : 'bg-red-600'} px-2 py-2 rounded-lg text-base font-bold transition active:scale-95`}>{u.is_banned ? 'Разбанить' : 'Забанить'}</button>
                            <button onClick={() => handleVerify(u.user_id, !u.is_verified)} className={`w-full ${u.is_verified ? 'bg-gray-500' : 'bg-green-600'} px-2 py-2 rounded-lg text-base font-bold transition active:scale-95`}>{u.is_verified ? 'Снять вериф.' : 'Верифицировать'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {tab === 'appeals' && (
            <div className="bg-black bg-opacity-70 rounded-xl p-4 shadow-lg flex flex-col gap-4 w-full">
              <div className="text-white font-bold mb-2">Апелляции на бан</div>
              {loadingAppeals ? <div className="text-white">Загрузка...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-white min-w-[400px]">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="p-2">ID</th>
                        <th className="p-2">User ID</th>
                        <th className="p-2">Сообщение</th>
                        <th className="p-2">Статус</th>
                        <th className="p-2">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appeals.map(a => (
                        <tr key={a._id} className="bg-gray-800">
                          <td className="p-2 break-all">{a._id}</td>
                          <td className="p-2 break-all">{a.user_id}</td>
                          <td className="p-2 break-all">{a.message}</td>
                          <td className="p-2">{a.status}</td>
                          <td className="p-2 flex flex-col gap-2 min-w-[120px]">
                            <button onClick={() => handleUnban(a.user_id, a._id)} className="w-full bg-green-600 px-2 py-2 rounded-lg text-base font-bold transition active:scale-95">Разбанить</button>
                            <button onClick={() => handleAppealStatus(a._id, 'rejected')} className="w-full bg-red-600 px-2 py-2 rounded-lg text-base font-bold transition active:scale-95">Отклонить</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {tab === 'messages' && (
            <div className="bg-black bg-opacity-70 rounded-xl p-4 shadow-lg flex flex-col gap-4 w-full">
              <div className="text-white font-bold mb-2">История сообщений</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-white min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="p-2">От кого</th>
                      <th className="p-2">Кому</th>
                      <th className="p-2">Сообщение</th>
                      <th className="p-2">Время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => (
                      <tr key={message._id} className="bg-gray-800">
                        <td className="p-2">{message.from_id}</td>
                        <td className="p-2">{message.to_id}</td>
                        <td className="p-2">{message.text}</td>
                        <td className="p-2">{new Date(message.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === 'logs' && (
            <div className="bg-black bg-opacity-70 rounded-xl p-4 shadow-lg flex flex-col gap-4 w-full">
              <div className="text-white font-bold mb-2">Все сообщения</div>
              {loadingMessages ? (
                <div className="text-white">Загрузка...</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-white min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-900">
                          <th className="p-2">Отправитель (ID)</th>
                          <th className="p-2">Получатель (ID)</th>
                          <th className="p-2">Текст</th>
                          <th className="p-2">Время</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map((msg) => (
                          <tr key={msg._id} className="bg-gray-800">
                            <td className="p-2">{msg.from_id}</td>
                            <td className="p-2">{msg.to_id}</td>
                            <td className="p-2">{msg.text}</td>
                            <td className="p-2">{new Date(msg.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <button
                      className="px-4 py-2 rounded-lg font-bold bg-gray-700 text-white disabled:opacity-50"
                      onClick={() => setMsgPage(p => Math.max(0, p - 1))}
                      disabled={msgPage === 0}
                    >
                      Назад
                    </button>
                    <span className="text-white">Страница {msgPage + 1}</span>
                    <button
                      className="px-4 py-2 rounded-lg font-bold bg-gray-700 text-white disabled:opacity-50"
                      onClick={() => setMsgPage(p => p + 1)}
                      disabled={messages.length < msgLimit}
                    >
                      Вперёд
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Здесь будет админский функционал
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1333] to-[#2d1e4f] p-4">
      <div className="bg-black bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col gap-4 w-full max-w-xs">
        <h2 className="text-xl font-bold text-white mb-2">Админ-панель</h2>
        <div className="text-white">Добро пожаловать, админ!</div>
        {/* Здесь можно добавить кнопки и функции для управления */}
      </div>
    </div>
  );
} 