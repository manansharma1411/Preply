const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    text: { type: String, required: true },
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

const metadataSchema = new mongoose.Schema(
  {
    pageCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/pdf' },
    checksum: { type: String, default: '' },
  },
  { _id: false }
);

const studyMaterialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Material must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'docx', 'pptx', 'txt'],
      default: 'pdf',
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      max: [52428800, 'File size cannot exceed 50MB'], // 50MB limit
    },
    storageRef: {
      type: String,
      required: [true, 'Storage reference is required'],
    },
    processingStatus: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    extractedText: {
      type: String,
      required: [true, 'Extracted text is required'],
      minlength: [10, 'Extracted text must be at least 10 characters'],
    },
    pages: {
      type: [pageSchema],
      default: [],
    },
    subject: {
      type: String,
      default: 'General',
      trim: true,
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    metadata: {
      type: metadataSchema,
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

// Compound Index for fast user document listings
studyMaterialSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
