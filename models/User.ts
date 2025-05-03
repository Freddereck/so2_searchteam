import mongoose from 'mongoose';

// Создаем схему пользователя
const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  nickname: { type: String, required: true },
  photo_url: { type: String },
  game_id: { type: String, required: true, unique: true },
  mmr: { type: Number, required: true },
  about: { type: String },
  search_expectations: { type: String },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  showUsername: { type: Boolean, default: true },
  showGameId: { type: Boolean, default: true },
  is_banned: { type: Boolean, default: false },
  useMessenger: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Создаем модель пользователя
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 