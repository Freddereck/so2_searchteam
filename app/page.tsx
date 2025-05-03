'use client';

import { useEffect, useState } from 'react';
import Chat from './components/Chat';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [createData, setCreateData] = useState<any>({ nickname: '', game_id: '', mmr: '' });
  const [gameIdError, setGameIdError] = useState('');
  const [mmrError, setMmrError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacy, setPrivacy] = useState({ showUsername: true, showGameId: true, useMessenger: true });
  const [savingSettings, setSavingSettings] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Получаем пользователя из Telegram SDK
  useEffect(() => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.ready();
      const userData = WebApp.initDataUnsafe.user;
      if (userData) setUser(userData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Кэшируем профиль пользователя через SWR
  const { data: dbUser, mutate: mutateDbUser, isLoading: dbUserLoading } = useSWR(
    user ? `/api/users?user_id=${user.id}` : null,
    fetcher
  );

  useEffect(() => {
    if (dbUser?.user_id) {
      fetch(`/api/messages?unread_for=${dbUser.user_id}`)
        .then(res => res.json())
        .then(data => setUnreadCount(data.unread || 0));
    }
  }, [dbUser?.user_id]);

  // Функция для генерации аватарки (первая буква ника)
  function getAvatar(nickname: string) {
    if (!nickname) return '?';
    return nickname[0].toUpperCase();
  }

  // Определение звания по MMR
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

  // Проверка Game ID (только цифры, длина 6-13)
  function validateGameId(gameId: string) {
    if (!/^[0-9]{6,13}$/.test(gameId)) {
      return 'Game ID должен содержать только цифры (6-13 знаков)';
    }
    return '';
  }

  function validateMmr(mmr: string) {
    const n = Number(mmr);
    if (!mmr || isNaN(n)) return 'MMR обязателен';
    if (n < 250 || n > 4999) return 'MMR должен быть от 250 до 4999';
    return '';
  }

  // Создать анкету
  async function handleCreateProfile() {
    if (!user) return;
    setCreating(true);
    setShowError(true);
    setError('');
    setGameIdError('');
    setMmrError('');
    const gameIdErr = validateGameId(createData.game_id);
    if (gameIdErr) {
      setGameIdError(gameIdErr);
      setCreating(false);
      return;
    }
    const mmrErr = validateMmr(createData.mmr);
    if (mmrErr) {
      setMmrError(mmrErr);
      setCreating(false);
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        username: user.username,
        nickname: createData.nickname || user.first_name,
        photo_url: user.photo_url || '',
        game_id: createData.game_id,
        mmr: Number(createData.mmr)
      })
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setCreating(false);
    } else {
      // Сразу обновляем данные пользователя (логиним)
      setCreating(false);
      mutateDbUser(data);
      setError('');
      setGameIdError('');
      setMmrError('');
    }
  }

  // Верификация
  function VerifiedBadge({ is_verified }: { is_verified: boolean }) {
    return is_verified ? (
      <span className="ml-2 text-green-400 font-bold" title="Верифицирован">✔</span>
    ) : (
      <span className="ml-2 text-red-400 font-bold" title="Не верифицирован">✖</span>
    );
  }

  // Открыть форму редактирования
  function openEdit() {
    setEditData({
      nickname: dbUser.nickname || '',
      about: dbUser.about || '',
      search_expectations: dbUser.search_expectations || '',
      mmr: dbUser.mmr || '',
      is_active: dbUser.is_active || false,
      is_searching: dbUser.is_searching || false,
      game_id: dbUser.game_id || ''
    });
    setEditOpen(true);
  }

  // Сохранить изменения
  async function handleSaveEdit() {
    setSaving(true);
    setShowError(true);
    setError('');
    setMmrError('');
    const mmrErr = validateMmr(editData.mmr);
    if (mmrErr) {
      setMmrError(mmrErr);
      setSaving(false);
      return;
    }
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: dbUser.user_id,
        ...editData,
        mmr: Number(editData.mmr)
      })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    setSaving(false);
    if (!data.error) setEditOpen(false);
  }

  // Плашка-уведомление для ошибок
  function ErrorAlert({ message, onClose }: { message: string, onClose: () => void }) {
    if (!message || !showError) return null;
    return (
      <div className="flex items-center justify-between bg-red-600 text-white font-bold px-4 py-3 rounded-lg shadow-lg mb-2 animate-fade-in relative">
        <span className="flex items-center gap-2"><span className="text-xl">❗</span> {message}</span>
        <button className="ml-4 text-2xl leading-none hover:text-red-200 absolute right-2 top-1" onClick={onClose}>&times;</button>
      </div>
    );
  }

  // Цветные бейджи для ранга
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

  // Открыть настройки
  function openSettings() {
    setPrivacy({
      showUsername: dbUser?.showUsername !== false,
      showGameId: dbUser?.showGameId !== false,
      useMessenger: dbUser?.useMessenger !== false
    });
    setSettingsOpen(true);
  }

  // Сохранить настройки
  async function handleSaveSettings() {
    setSavingSettings(true);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: dbUser.user_id,
        showUsername: privacy.showUsername,
        showGameId: privacy.showGameId,
        useMessenger: privacy.useMessenger
      })
    });
    await res.json();
    setSavingSettings(false);
    setSettingsOpen(false);
    mutateDbUser(); // обновляем кэш
  }

  async function handleAppeal() {
    setAppealError('');
    if (!appealMessage.trim()) {
      setAppealError('Пожалуйста, опишите причину апелляции.');
      return;
    }
    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: dbUser.user_id, message: appealMessage })
    });
    if (res.ok) {
      setAppealSent(true);
    } else {
      const data = await res.json();
      setAppealError(data.error || 'Ошибка отправки. Попробуйте позже.');
    }
  }

  if (dbUser && dbUser.is_banned) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1333] to-[#2d1e4f] p-4">
        <div className="bg-black bg-opacity-80 rounded-xl p-8 shadow-lg flex flex-col items-center gap-6">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Вы забанены</h2>
          <p className="text-white text-lg mb-4">Ваша анкета заблокирована. Если вы считаете, что это ошибка — подайте апелляцию.</p>
          {appealSent ? (
            <div className="text-green-400 font-bold">Ваша апелляция отправлена! Ожидайте ответа.</div>
          ) : (
            <div className="w-full max-w-xs flex flex-col gap-3">
              <textarea
                className="w-full p-3 rounded bg-gray-800 text-white text-lg"
                rows={4}
                placeholder="Опишите причину апелляции..."
                value={appealMessage}
                onChange={e => setAppealMessage(e.target.value)}
              />
              {appealError && <div className="text-red-400 font-bold text-sm">{appealError}</div>}
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition"
                onClick={handleAppeal}
              >
                Подать апелляцию
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start p-4 max-w-full bg-gradient-to-br from-[#1a1333] to-[#2d1e4f]">
      {/* Фоновое изображение с затемнением */}
      <div className="fixed inset-0 -z-10">
        <img src="/wallpaper.jpg" alt="wallpaper" className="w-full h-full object-cover blur-lg" />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      {/* Название приложения */}
      <h1 className="text-3xl font-extrabold text-white drop-shadow-lg mt-4 mb-6 text-center">Companion SO2</h1>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
          <div className="loader mb-4"></div>
          <span className="text-white text-lg font-bold">Загрузка...</span>
        </div>
      ) : dbUser && !dbUser.error ? (
        <div className="flex flex-col items-center w-full max-w-xs gap-6 animate-fade-in">
          {/* Верификация */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-semibold">{dbUser.is_verified ? 'Верифицирован' : 'Не верифицирован'}</span>
            <VerifiedBadge is_verified={dbUser.is_verified} />
          </div>
          {/* Аватарка и никнейм */}
          <div className="flex flex-col items-center gap-2">
            {user && user.photo_url ? (
              <img
                src={user.photo_url}
                alt="avatar"
                className="w-24 h-24 rounded-full border-4 border-indigo-400 shadow-lg object-cover animate-fade-in ring-4 ring-purple-400"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-4xl font-bold text-white shadow-lg border-4 border-indigo-400 animate-fade-in">
                {getAvatar(dbUser.nickname)}
              </div>
            )}
            <div className="text-2xl font-bold text-white mt-2 break-words text-center">{dbUser.nickname || <span className="text-gray-400">Не указано</span>}</div>
            <div className="flex items-center gap-2 text-blue-300 text-sm break-words">
              <span className="inline-flex items-center"><span className="mr-1">🎮</span>Game ID: <span className="font-semibold ml-1">{dbUser.game_id || <span className="text-gray-400">Не указано</span>}</span></span>
            </div>
            <div className="flex items-center gap-2 text-yellow-200 text-sm break-words">
              <span className="inline-flex items-center"><span className="mr-1">🏆</span>MMR: <span className="font-semibold ml-1">{dbUser.mmr || <span className="text-gray-400">Не указано</span>}</span>{getRankBadge(Number(dbUser.mmr))}</span>
            </div>
          </div>
          {/* Плашка: О себе и ожидания */}
          <div className="bg-black bg-opacity-60 rounded-xl p-4 w-full shadow-md neon-glow mb-2 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2"><span className="text-indigo-300">📝</span><span className="font-semibold text-indigo-300">О себе:</span> <span className="ml-1">{dbUser.about || <span className="text-gray-400">Не указано</span>}</span></div>
            <div className="flex items-center gap-2"><span className="text-indigo-300">💬</span><span className="font-semibold text-indigo-300">Ожидания:</span> <span className="ml-1">{dbUser.search_expectations || <span className="text-gray-400">Не указано</span>}</span></div>
          </div>
          {/* Плашка: Статус и имя пользователя */}
          <div className="bg-black bg-opacity-60 rounded-xl p-4 w-full shadow-md neon-glow flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2"><span className="text-indigo-300">👤</span><span className="font-semibold text-indigo-300">Имя пользователя:</span> <span className="ml-1">{dbUser.username || <span className="text-gray-400">Не указано</span>}</span></div>
            <div className="flex items-center gap-2"><span className="text-green-400">{dbUser.is_active ? '🟢' : '⚪'}</span><span className="font-semibold text-indigo-300">Активен:</span> <span className="ml-1">{dbUser.is_active ? 'Да' : 'Нет'}</span></div>
          </div>
          {/* Кнопки */}
          <div className="flex flex-col gap-3 mt-4 w-full">
            <button className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl text-lg shadow-lg active:scale-95 transition" onClick={openEdit}>Редактировать анкету</button>
            <button className="bg-gray-700 text-white font-bold py-4 px-4 rounded-xl text-lg shadow-lg active:scale-95 transition" onClick={openSettings}>Настройки</button>
          </div>
        </div>
      ) : user ? (
        <div className="flex flex-col items-center w-full max-w-xs gap-4">
          <p className="text-white bg-black bg-opacity-60 p-4 rounded-lg">Анкета не найдена. Создайте свою!</p>
          <ErrorAlert message={error} onClose={() => setShowError(false)} />
          <label className="text-white text-sm w-full">Никнейм:
            <input className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={createData.nickname} onChange={e => setCreateData({ ...createData, nickname: e.target.value })} />
          </label>
          <label className="text-white text-sm w-full">Game ID:
            <input className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={createData.game_id} onChange={e => {
              setCreateData({ ...createData, game_id: e.target.value.replace(/\D/g, '') });
              setGameIdError('');
              setError('');
            }} maxLength={13} />
          </label>
          {gameIdError && <ErrorAlert message={gameIdError} onClose={() => setGameIdError('')} />}
          <label className="text-white text-sm w-full">MMR:
            <input type="number" className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={createData.mmr} onChange={e => {
              setCreateData({ ...createData, mmr: e.target.value.replace(/\D/g, '') });
              setMmrError('');
            }} min={250} max={4999} />
            <span className="text-xs text-yellow-400 ml-1">{getRank(Number(createData.mmr))}</span>
          </label>
          {mmrError && <ErrorAlert message={mmrError} onClose={() => setMmrError('')} />}
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition w-full text-lg"
            onClick={handleCreateProfile}
            disabled={creating}
          >
            {creating ? 'Создание...' : 'Создать анкету'}
          </button>
        </div>
      ) : (
        <p className="text-white bg-black bg-opacity-60 p-4 rounded-lg">Пользователь не найден или вы не в Telegram...</p>
      )}

      {/* Модальное окно редактирования анкеты */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs shadow-xl flex flex-col gap-4 animate-fade-in overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-white mb-2">Редактировать анкету</h2>
            <label className="text-white text-sm">Никнейм:
              <input className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={editData.nickname} onChange={e => setEditData({ ...editData, nickname: e.target.value })} />
            </label>
            <label className="text-white text-sm">Game ID:
              <input className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg opacity-60 cursor-not-allowed" value={editData.game_id} disabled />
              <span className="text-xs text-gray-400 ml-1">(Заблокирован, изменить можно только через админа)</span>
            </label>
            <label className="text-white text-sm">О себе:
              <textarea className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={editData.about} onChange={e => setEditData({ ...editData, about: e.target.value })} />
            </label>
            <label className="text-white text-sm">Ожидания:
              <input className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={editData.search_expectations} onChange={e => setEditData({ ...editData, search_expectations: e.target.value })} />
            </label>
            <label className="text-white text-sm">MMR:
              <input type="number" className="w-full mt-1 p-3 rounded bg-gray-800 text-white text-lg" value={editData.mmr} onChange={e => {
                setEditData({ ...editData, mmr: e.target.value.replace(/\D/g, '') });
                setMmrError('');
              }} min={250} max={4999} />
              <span className="text-xs text-yellow-400 ml-1">{getRank(Number(editData.mmr))}</span>
            </label>
            {mmrError && <ErrorAlert message={mmrError} onClose={() => setMmrError('')} />}
            <div className="flex gap-2 items-center">
              <label className="text-white text-sm flex items-center gap-1">
                <input type="checkbox" checked={editData.is_active} onChange={e => setEditData({ ...editData, is_active: e.target.checked })} /> Активен
              </label>
            </div>
            {error && <ErrorAlert message={error} onClose={() => setShowError(false)} />}
            <div className="flex gap-2 mt-2">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition w-1/2 text-lg" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
              <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded transition w-1/2 text-lg" onClick={() => setEditOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs shadow-xl flex flex-col gap-4 animate-fade-in overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-white mb-2">Настройки</h2>
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Приватность</h3>
            {/* Красивая кнопка-переключатель для Telegram username */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Показывать Telegram username</span>
              <button
                className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out focus:outline-none ${privacy.showUsername ? 'bg-green-500' : 'bg-gray-600'}`}
                onClick={() => setPrivacy({ ...privacy, showUsername: !privacy.showUsername })}
              >
                <span
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${privacy.showUsername ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
            {/* Красивая кнопка-переключатель для Game ID */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Показывать Game ID</span>
              <button
                className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out focus:outline-none ${privacy.showGameId ? 'bg-green-500' : 'bg-gray-600'}`}
                onClick={() => setPrivacy({ ...privacy, showGameId: !privacy.showGameId })}
              >
                <span
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${privacy.showGameId ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
            {/* Красивая кнопка-переключатель для использования мессенджера */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Использовать мессенджер</span>
              <button
                className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out focus:outline-none ${privacy.useMessenger ? 'bg-green-500' : 'bg-gray-600'}`}
                onClick={() => setPrivacy({ ...privacy, useMessenger: !privacy.useMessenger })}
              >
                <span
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${privacy.useMessenger ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition w-1/2 text-lg"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded transition w-1/2 text-lg"
                onClick={() => setSettingsOpen(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-8 w-full">
        <a href="/search" className="bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-4 px-4 rounded-xl text-lg shadow-lg text-center active:scale-95 transition block">
          🔍 Поиск тиммейтов
        </a>
        {dbUser?.useMessenger && (
          <a href="/messages" className="relative bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl text-lg shadow-lg text-center active:scale-95 transition block">
            💬 Сообщения
            {unreadCount > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </a>
        )}
        {/* Кнопка "Админ-панель" только для админа */}
        {user && user.id === 1250640778 && (
          <a href="/admin" className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl text-lg shadow-lg text-center active:scale-95 transition block mt-4">
            Админ-панель
          </a>
        )}
    </div>

      <style jsx global>{`
        .neon-glow {
          box-shadow: 0 0 16px 2px #7f5fff, 0 0 32px 4px #5f2fff33;
        }
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
        .toggle-switch {
          transition: background 0.3s;
        }
      `}</style>
    </main>
  );
}
