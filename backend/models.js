const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'teacher', enum: ['teacher'] }
});

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  level: { type: Number, default: 1, min: 1, max: 59 },
  sublevel: { type: Number, default: 1 }
});

const worksheetSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  level: { type: Number, required: true },
  sublevel: { type: Number, default: 1 },
  worksheetJson: { type: mongoose.Schema.Types.Mixed },
  pdfPath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const scanBatchSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  rawIcrJson: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['received', 'processed', 'error'], default: 'received' },
  receivedAt: { type: Date, default: Date.now }
});

const answerSubmissionSchema = new mongoose.Schema({
  worksheetId: { type: String, default: null },
  studentId: { type: String, required: true },
  icrAnswers: { type: mongoose.Schema.Types.Mixed, required: true },
  score: { type: String, required: true }, // e.g., "3/5" or "correct/total"
  evaluatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Worksheet = mongoose.model('Worksheet', worksheetSchema);
const ScanBatch = mongoose.model('ScanBatch', scanBatchSchema);
const AnswerSubmission = mongoose.model('AnswerSubmission', answerSubmissionSchema);

module.exports = {
  User,
  Student,
  Worksheet,
  ScanBatch,
  AnswerSubmission
};
