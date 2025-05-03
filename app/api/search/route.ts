import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.UserSearch || mongoose.model('UserSearch', userSchema, 'users');

export async function GET(request: Request) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    const { searchParams } = new URL(request.url);
    const mmrFrom = Number(searchParams.get('mmr_from')) || 250;
    const mmrTo = Number(searchParams.get('mmr_to')) || 4999;
    const verified = searchParams.get('verified');
    const searching = searchParams.get('searching');

    const filter: any = {
      mmr: { $gte: mmrFrom, $lte: mmrTo },
      is_active: true
    };
    if (verified === 'true') filter.is_verified = true;
    if (searching === 'true') filter.is_searching = true;

    const users = await User.find(filter).sort({ mmr: 1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка поиска игроков' }, { status: 500 });
  }
} 