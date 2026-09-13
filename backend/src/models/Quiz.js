const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    document: { type: String, trim: true, default: null },
    page: { type: Number, default: null, min: 1 },
    section: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [{ type: String, required: true, trim: true }],
      validate: [
        (val) => val.length >= 2 && val.length <= 6,
        'Question must have between 2 and 6 options',
      ],
    },
    correctOptionIndex: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: 0,
    },
    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
      trim: true,
    },
    topicTag: {
      type: String,
      required: [true, 'Topic tag is required'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    source: {
      type: sourceSchema,
      default: null,
    },
  },
  { _id: false }
);

const generationMetadataSchema = new mongoose.Schema(
  {
    modelName: { type: String, default: 'gemini-2.0-flash' },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    temperature: { type: Number, default: 0.2 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: [true, 'Quiz must be linked to a study material'],
      index: true,
    },
    studySessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudySession',
      required: [true, 'Quiz must be linked to a study session'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Quiz must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    questions: {
      type: [questionSchema],
      validate: [
        (val) => val.length >= 1,
        'Quiz must contain at least 1 question',
      ],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive'],
      default: 'medium',
    },
    generationMetadata: {
      type: generationMetadataSchema,
      default: () => ({}),
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

// Virtual property for total questions count
quizSchema.virtual('totalQuestions').get(function () {
  return this.questions ? this.questions.length : 0;
});

module.exports = mongoose.model('Quiz', quizSchema);
