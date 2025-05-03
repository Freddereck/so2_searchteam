import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appeal from '@/models/Appeal';

export async function GET() {
  await connectDB();
  const appeals = await Appeal.find().sort({ createdAt: -1 });
  return NextResponse.json(appeals);
}

export async function POST(request: Request) {
  await connectDB();
  const body = await request.json();
  const { user_id, message } = body;
  if (!user_id || !message) {
    return NextResponse.json({ error: 'user_id и message обязательны' }, { status: 400 });
  }
  const existing = await Appeal.findOne({ user_id, status: { $in: ['pending', 'reviewed'] } });
  if (existing) {
    return NextResponse.json({ error: 'У вас уже есть активная апелляция.' }, { status: 400 });
  }
  const appeal = await Appeal.create({ user_id, message });
  return NextResponse.json(appeal);
}

export async function PATCH(request: Request) {
  await connectDB();
  const body = await request.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: 'id и status обязательны' }, { status: 400 });
  }
  const appeal = await Appeal.findByIdAndUpdate(id, { status }, { new: true });
  return NextResponse.json(appeal);
} 