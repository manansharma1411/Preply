const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    document: { type: String, trim: true, default: null },
    page: { type: Number, default: null, min: 1 },
    section: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true, default: 'General' },
    studyGoal: {
      type: String,
      enum: ['Quick Revision', 'Internal Exam', 'Semester Exam', 'Deep Understanding'],
      default: 'Semester Exam',
    },
    studyTime: {
      type: String,
      enum: ['15 minutes', '30 minutes', '1 hour', '2+ hours'],
      default: '30 minutes',
    },
    targetDifficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
  },
  { _id: false }
);

const keyTopicSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    importance: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    source: { type: sourceSchema, default: null },
  },
  { _id: false }
);

const conceptSchema = new mongoose.Schema(
  {
    concept: { type: String, required: true, trim: true },
    explanation: { type: String, required: true, trim: true },
    examples: [{ type: String, trim: true }],
    source: { type: sourceSchema, default: null },
  },
  { _id: false }
);

const definitionSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true },
    definition: { type: String, required: true, trim: true },
    source: { type: sourceSchema, default: null },
  },
  { _id: false }
);

const conceptNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['topic', 'subtopic', 'concept'], default: 'concept' },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const conceptEdgeSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    target: { type: String, required: true, trim: true },
    relationship: { type: String, default: 'relates_to', trim: true },
  },
  { _id: false }
);

const conceptMapSchema = new mongoose.Schema(
  {
    nodes: [conceptNodeSchema],
    edges: [conceptEdgeSchema],
  },
  { _id: false }
);

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Session must belong to a user'],
      index: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: [true, 'Session must belong to a study material'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      minlength: [20, 'Summary must be at least 20 characters'],
    },
    keyTopics: [keyTopicSchema],
    importantConcepts: [conceptSchema],
    definitions: [definitionSchema],
    conceptMap: {
      type: conceptMapSchema,
      default: () => ({ nodes: [], edges: [] }),
    },
    examTips: [{ type: String, trim: true }],
    recommendedRevisionAreas: [{ type: String, trim: true }],
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    generatedAt: {
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

// Compound index for querying user study sessions
studySessionSchema.index({ userId: 1, materialId: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
