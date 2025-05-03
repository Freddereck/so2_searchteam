import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Message from '@/models/Message';

// Получить сообщения
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');
    // Параметры пагинации
    const limit = Number(searchParams.get('limit')) || 20;
    const skip = Number(searchParams.get('skip')) || 0;
    // Если указаны user1 и user2 — ищем все сообщения между ними
    if (user1 && user2) {
      // Проверка: только участники диалога могут видеть сообщения
      // (user1 или user2 должны совпадать с авторизованным пользователем)
      // Для простоты (и чтобы не усложнять авторизацию), пока не реализуем строгую проверку авторизации,
      // но в реальном проекте тут нужно сверять user_id из сессии/токена!
      const messages = await Message.find({
        $or: [
          { from_id: Number(user1), to_id: Number(user2) },
          { from_id: Number(user2), to_id: Number(user1) }
        ]
      })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
      return NextResponse.json(messages.reverse()); // чтобы были по возрастанию времени
    }
    // Старый режим (по from_id/to_id)
    const from_id = searchParams.get('from_id');
    const to_id = searchParams.get('to_id');
    let query = {};
    if (from_id) query = { from_id: Number(from_id) };
    if (to_id) query = { to_id: Number(to_id) };
    const messages = await Message.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);
    const unread_for = searchParams.get('unread_for');
    if (unread_for) {
      // Считаем непрочитанные сообщения для пользователя
      const count = await Message.countDocuments({ to_id: Number(unread_for), is_read: false });
      return NextResponse.json({ unread: count });
    }
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при получении сообщений' }, { status: 500 });
  }
}

// Отправить сообщение
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { from_id, to_id, text } = body;
    
    // Проверяем, что все необходимые поля заполнены
    if (!from_id || !to_id || !text) {
      return NextResponse.json({ error: 'Не все поля заполнены' }, { status: 400 });
    }
    
    // Создаем новое сообщение
    const message = await Message.create({
      from_id: Number(from_id),
      to_id: Number(to_id),
      text
    });
    
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при отправке сообщения' }, { status: 500 });
  }
}

// Отметить сообщения как прочитанные
export async function PATCH(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { message_ids } = body;
    
    if (!message_ids || !Array.isArray(message_ids)) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 });
    }
    
    // Отмечаем сообщения как прочитанные
    await Message.updateMany(
      { _id: { $in: message_ids } },
      { is_read: true }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при обновлении сообщений' }, { status: 500 });
  }
} 