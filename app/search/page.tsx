'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Chat from '../components/Chat';

function getRank(mmr: number) {
  if (mmr >= 250 && mmr <= 299) return 'Bronze 1';
  if (mmr >= 300 && mmr <= 399) return 'Bronze 2';
  if (mmr >= 400 && mmr <= 499) return 'Bronze 3';
  if (mmr >= 500 && mmr <= 599) return 'Bronze 4';
  if (mmr >= 600 && mmr <= 699) return 'Silver 2';
  if (mmr >= 700 && mmr <= 799) return 'Silver 2';
  if (mmr >= 800 && mmr <= 899) return 'Silver 3';
  if (mmr >= 900 && mmr <= 999) return 'Silver 4';
  if (mmr >= 1000 && mmr <= 1099) return 'Gold 1';
  if (mmr >= 1100 && mmr <= 1199) return 'Gold 2';
  if (mmr >= 1200 && mmr <= 1299) return 'Gold 3';
  if (mmr >= 1300 && mmr <= 1399) return 'Gold 4';
  if (mmr >= 1400 && mmr <= 1499) return 'Phoenix';
  if (mmr >= 1500 && mmr <= 1599) return 'Ranger';
  if (mmr >= 1600 && mmr <= 1699) return 'Champion';
  if (mmr >= 1700 && mmr <= 1799) return 'Master';
  if (mmr >= 1800 && mmr <= 2099) return 'Elite';
  if (mmr >= 2100) return 'Legend';
  return 'Нет звания';
}

function getRankBadge(mmr: number) {
  const rank = getRank(mmr);
  const colorMap: any = {
    'Bronze 1': 'bg-yellow-700 text-yellow-200',
    'Bronze 2': 'bg-yellow-700 text-yellow-200',
    'Bronze 3': 'bg-yellow-700 text-yellow-200',
    'Bronze 4': 'bg-yellow-700 text-yellow-200',
    'Silver 2': 'bg-gray-400 text-gray-900',
    'Silver 3': 'bg-gray-400 text-gray-900',
    'Silver 4': 'bg-gray-400 text-gray-900',
    'Gold 1': 'bg-yellow-400 text-yellow-900',
    'Gold 2': 'bg-yellow-400 text-yellow-900',
    'Gold 3': 'bg-yellow-400 text-yellow-900',
    'Gold 4': 'bg-yellow-400 text-yellow-900',
    'Phoenix': 'bg-orange-400 text-white',
    'Ranger': 'bg-green-500 text-white',
    'Champion': 'bg-blue-500 text-white',
    'Master': 'bg-purple-500 text-white',
    'Elite': 'bg-pink-500 text-white',
    'Legend': 'bg-red-600 text-white',
    'Нет звания': 'bg-gray-700 text-gray-300'
  };
  return <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${colorMap[rank] || 'bg-gray-700 text-gray-300'}`}>{rank}</span>;
}

export default function Search() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mmr, setMmr] = useState('');
  const [mmrRange, setMmrRange] = useState(200);
  const [showVerified, setShowVerified] = useState(false);
  const [userMmr, setUserMmr] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.ready();
      const userData = WebApp.initDataUnsafe.user;
      if (userData) {
        setUser(userData);
        // Получаем данные пользователя для определения его MMR и статуса
        fetch(`/api/users?user_id=${userData.id}`)
          .then(res => res.json())
          .then(async data => {
            if (data.mmr) {
              setUserMmr(data.mmr);
              setMmr(data.mmr.toString());
            }
            // Если анкета неактивна, делаем её активной
            if (data && data.is_active === false) {
              await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: data.user_id, is_active: true })
              });
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [mmr, mmrRange, showVerified]);

  async function fetchUsers() {
    const params = new URLSearchParams();
    if (mmr) {
      const minMmr = Math.max(250, Number(mmr) - mmrRange);
      const maxMmr = Math.min(4999, Number(mmr) + mmrRange);
      params.append('min_mmr', minMmr.toString());
      params.append('max_mmr', maxMmr.toString());
    }
    if (showVerified) params.append('is_verified', 'true');

    const res = await fetch(`/api/users?${params.toString()}`);
    const data = await res.json();
    // Исключаем свою анкету из результатов
    const filtered = Array.isArray(data) && user ? data.filter(u => u.user_id !== user.id) : data;
    setUsers(filtered);
  }

  // Функция для генерации аватарки
  function getAvatar(nickname: string) {
    if (!nickname) return '?';
    return nickname[0].toUpperCase();
  }

  // Верификация
  function VerifiedBadge({ is_verified }: { is_verified: boolean }) {
    return is_verified ? (
      <span className="inline-block bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1 align-middle">Верифицирован</span>
    ) : (
      <span className="inline-block bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1 align-middle">Не верифицирован</span>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1a1333] to-[#2d1e4f]">
        <p className="text-white bg-black bg-opacity-60 p-4 rounded-lg">Пожалуйста, откройте приложение через Telegram...</p>
      </main>
    );
  }

  // Если пользователь забанен, показываем бан-экран
  if (user && users.length === 1 && users[0].is_banned && users[0].user_id === user.id) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1333] to-[#2d1e4f] p-4">
        <div className="bg-black bg-opacity-80 rounded-xl p-8 shadow-lg flex flex-col items-center gap-6">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Вы забанены</h2>
          <p className="text-white text-lg mb-4">Ваша анкета заблокирована. Если вы считаете, что это ошибка — подайте апелляцию.</p>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition">Подать апелляцию</button>
        </div>
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
        <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">Поиск тиммейтов</h1>
        <Link href="/" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition">
          На главную
        </Link>
      </div>

      {/* Фильтры */}
      <div className="w-full max-w-md space-y-4 mb-6">
        <div className="bg-black bg-opacity-60 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white text-sm block mb-2">MMR (ваш: {userMmr})</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  className="flex-1 p-2 rounded bg-gray-800 text-white"
                  value={mmr}
                  onChange={e => setMmr(e.target.value)}
                  min={250}
                  max={4999}
                  placeholder="Введите MMR"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  className={`px-3 py-1 rounded ${mmrRange === 200 ? 'bg-purple-600' : 'bg-gray-700'} text-white`}
                  onClick={() => setMmrRange(200)}
                >
                  ±200
                </button>
                <button
                  className={`px-3 py-1 rounded ${mmrRange === 400 ? 'bg-purple-600' : 'bg-gray-700'} text-white`}
                  onClick={() => setMmrRange(400)}
                >
                  ±400
                </button>
                <button
                  className={`px-3 py-1 rounded ${mmrRange === 600 ? 'bg-purple-600' : 'bg-gray-700'} text-white`}
                  onClick={() => setMmrRange(600)}
                >
                  ±600
                </button>
                <button
                  className={`px-3 py-1 rounded ${mmrRange === 9999 ? 'bg-purple-600' : 'bg-gray-700'} text-white`}
                  onClick={() => setMmrRange(9999)}
                >
                  Все
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={showVerified}
                  onChange={e => setShowVerified(e.target.checked)}
                  className="rounded"
                />
                Только верифицированные
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] w-full">
          <div className="loader mb-4"></div>
          <span className="text-white text-lg font-bold">Загрузка...</span>
        </div>
      )}

      {/* Нет пользователей */}
      {!loading && users.length === 0 && (
        <div className="w-full max-w-md bg-black bg-opacity-70 rounded-xl p-6 text-center text-lg text-white font-bold shadow-lg animate-fade-in">
          Сейчас нет активных людей в этом диапазоне MMR
        </div>
      )}

      {/* Список пользователей */}
      {!loading && users.length > 0 && (
        <div className="w-full max-w-md space-y-4">
          {users.map(user => (
            <div key={user.user_id} className="bg-black bg-opacity-60 rounded-xl p-4 shadow-lg animate-fade-in flex flex-col gap-2">
              <div className="flex items-center gap-4">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt="avatar"
                    className="w-16 h-16 rounded-full border-2 border-indigo-400"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-2xl font-bold text-white">
                    {getAvatar(user.nickname)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-bold text-white">{user.nickname}</h3>
                    <VerifiedBadge is_verified={user.is_verified} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                    <span>MMR: {user.mmr}</span>
                    {getRankBadge(user.mmr)}
                  </div>
                  {user.showUsername && user.username && (
                    <div className="text-sm text-blue-300">@{user.username}</div>
                  )}
                  {user.showGameId && user.game_id && (
                    <div className="text-sm text-yellow-300">Game ID: {user.game_id}</div>
                  )}
                </div>
              </div>
              {user.about && (
                <div className="mt-2 text-gray-300">
                  <div className="font-semibold text-indigo-300">О себе:</div>
                  <div>{user.about}</div>
                </div>
              )}
              {user.search_expectations && (
                <div className="mt-2 text-gray-300">
                  <div className="font-semibold text-indigo-300">Ожидания:</div>
                  <div>{user.search_expectations}</div>
                </div>
              )}
              {/* Кнопка "Написать" или "Написать в Telegram" */}
              {user.useMessenger ? (
                <Link
                  href={`/messages?partner=${user.user_id}`}
                  className="mt-4 block bg-purple-600 hover:bg-purple-700 text-white text-center px-4 py-2 rounded-lg text-base font-bold transition active:scale-95"
                >
                  Написать
                </Link>
              ) : user.username ? (
                <a
                  href={`https://t.me/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-lg text-base font-bold transition active:scale-95"
                >
                  Написать в Telegram
                </a>
              ) : null}
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedPlayer(user)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded transition active:scale-95"
                >
                  Написать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Добавляем модальное окно с чатом */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Чат с {selectedPlayer.nickname}</h2>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <Chat 
              userId={user.id} 
              partnerId={selectedPlayer.user_id} 
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.7s;
        }
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
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}