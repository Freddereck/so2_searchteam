import mongoose from 'mongoose';

const appealSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'pending' }, // pending, reviewed, rejected
  createdAt: { type: Date, default: Date.now }
});

const Appeal = mongoose.models.Appeal || mongoose.model('Appeal', appealSchema);

export default Appeal; 