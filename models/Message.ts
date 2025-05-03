import mongoose from 'mongoose';

// Создаем схему (шаблон) для сообщений
const MessageSchema = new mongoose.Schema({
  from_id: { type: Number, required: true },    // ID отправителя
  to_id: { type: Number, required: true },      // ID получателя
  text: { type: String, required: true },       // Текст сообщения
  is_read: { type: Boolean, default: false },   // Прочитано ли сообщение
  created_at: { type: Date, default: Date.now } // Время отправки
});

// Добавляем индексы для ускорения поиска
MessageSchema.index({ from_id: 1 });
MessageSchema.index({ to_id: 1 });
MessageSchema.index({ created_at: -1 });
MessageSchema.index({ is_read: 1 });

// Если модель уже существует - используем её, если нет - создаем новую
export default mongoose.models.Message || mongoose.model('Message', MessageSchema); 