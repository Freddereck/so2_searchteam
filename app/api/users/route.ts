import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const min_mmr = searchParams.get('min_mmr');
    const max_mmr = searchParams.get('max_mmr');
    const is_verified = searchParams.get('is_verified');
    const is_searching = searchParams.get('is_searching');
    const all = searchParams.get('all');

    // Если запрашивают конкретного пользователя
    if (user_id) {
      const user = await User.findOne({ user_id: Number(user_id) });
      if (!user) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // Поиск пользователей по фильтрам
    const query: any = {};
    if (!all) {
      query.is_active = true;
    }
    if (min_mmr && max_mmr) {
      query.mmr = { $gte: Number(min_mmr), $lte: Number(max_mmr) };
    }
    if (is_verified === 'true') {
      query.is_verified = true;
    }
    if (is_searching === 'true') {
      query.is_searching = true;
    }

    const users = await User.find(query);
    
    // Обрабатываем настройки приватности
    const processedUsers = users.map(user => {
      const userObj = user.toObject();
      if (!userObj.showUsername) {
        delete userObj.username;
      }
      if (!userObj.showGameId) {
        delete userObj.game_id;
      }
      return userObj;
    });

    return NextResponse.json(processedUsers);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { user_id, username, nickname, photo_url, game_id, mmr } = body;

    // Проверяем, существует ли пользователь с таким game_id
    const existingUser = await User.findOne({ game_id });
    if (existingUser) {
      return NextResponse.json({ error: 'Game ID уже используется' }, { status: 400 });
    }

    const user = await User.create({
      user_id,
      username,
      nickname,
      photo_url,
      game_id,
      mmr,
      showUsername: true, // По умолчанию показываем
      showGameId: true,   // По умолчанию показываем
      is_banned: false    // По умолчанию не забанен
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { user_id, ...updateData } = body;
    console.log('PATCH BODY', body, updateData);

    // Приводим is_banned к boolean, если оно есть
    if ('is_banned' in updateData) {
      updateData.is_banned = updateData.is_banned === true || updateData.is_banned === 'true';
    }

    const user = await User.findOneAndUpdate(
      { user_id: { $in: [user_id, String(user_id), Number(user_id)] } },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 