const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionIndex: { type: Number, required: true, min: 0 },
    isCorrect: { type: Boolean, required: true },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const topicPerformanceSchema = new mongoose.Schema(
  {
    topicTag: { type: String, required: true, trim: true },
    totalQuestions: { type: Number, required: true, min: 1 },
    correctAnswers: { type: Number, required: true, min: 0 },
    accuracyPercentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const difficultyPerformanceSchema = new mongoose.Schema(
  {
    difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    accuracyPercentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz attempt must link to a Quiz'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Quiz attempt must belong to a User'],
      index: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: [true, 'Quiz attempt must link to a StudyMaterial'],
      index: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      required: [true, 'Score count is required'],
      min: 0,
    },
    percentage: {
      type: Number,
      required: [true, 'Percentage score is required'],
      min: 0,
      max: 100,
    },
    topicWisePerformance: [topicPerformanceSchema],
    difficultyWisePerformance: [difficultyPerformanceSchema],
    weakTopics: [{ type: String, trim: true }],
    strongTopics: [{ type: String, trim: true }],
    recommendedRevisionAreas: [{ type: String, trim: true }],
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound Index for fast retrieval of user quiz history
quizAttemptSchema.index({ userId: 1, quizId: 1, completedAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
