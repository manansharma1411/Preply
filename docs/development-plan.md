# Preply - Development & Implementation Roadmap

## 1. Overview & Hackathon Constraints

This document documents the phased implementation roadmap executed during the development of **Preply**.

### Git & Repository Execution Policy
- **Single Branch Execution**: Development was conducted on the `main` branch.
- **Layered Implementation**: Architecture foundation ➔ Database models ➔ Backend API endpoints ➔ Gemini AI Service ➔ Document Pipeline ➔ Core Workflow ➔ Security Hardening ➔ QA Reliability Audit ➔ Visual Polish.

---

## 2. Phase-by-Phase Execution Status

### Phase 1: Architecture, Scaffolding & Specifications (Completed)
- [x] Set up workspace directory structure (`frontend/`, `backend/`, `database/`, `docs/`).
- [x] Configured environment variable templates (`.env.example`, `backend/.env.example`, `frontend/.env.example`).
- [x] Defined primary product workflow and technical documentation.

### Phase 2: Database Layer & Data Models (Completed)
- [x] Configured MongoDB Mongoose connection module with health check diagnostics (`backend/src/config/db.js`).
- [x] Created Mongoose schemas:
  - `User.js` (Auth, hashed passwords with `select: false`, student preferences).
  - `StudyMaterial.js` (PDF file metadata, storage reference, extracted text).
  - `StudySession.js` (Summary, prioritized key topics, glossaries, exam tips).
  - `Quiz.js` (MCQ questions, correct option indices, explanations, topic tags).
  - `QuizAttempt.js` (Student answers, score, overall percentage, per-topic accuracy percentages, weak topics).

### Phase 3: Layered Backend API Foundation (Completed)
- [x] Built REST API versioning under `/api/v1/`.
- [x] Implemented authentication middleware (`auth.js`) using JWT and password hashing (`bcryptjs`).
- [x] Implemented input validation middleware (`validate.js`) using Joi schemas.
- [x] Built core endpoints:
  - `GET /api/v1/health`
  - `POST /api/v1/auth/register`, `login`, `logout`, `GET /me`
  - `POST /api/v1/materials/upload`, `GET /materials`, `GET /materials/:id`, `DELETE /materials/:id`
  - `POST /api/v1/study-sessions`, `GET /study-sessions`, `GET /study-sessions/:id`
  - `GET /api/v1/quizzes/:id`, `POST /quizzes/:id/attempts`, `GET /quizzes/:id/attempts`
  - `GET /api/v1/dashboard`

### Phase 4: Gemini AI Integration Service (Completed)
- [x] Integrated `@google/genai` SDK in `backend/src/services/geminiService.js`.
- [x] Created system prompt builders (`promptBuilder.js`) with non-negotiable fact-grounding directives.
- [x] Built AI response sanitizer & JSON schema validator (`aiResponseValidator.js`).
- [x] Added mock fallback mode for execution when `GEMINI_API_KEY` is omitted.

### Phase 5: PDF Processing Pipeline (Completed)
- [x] Built modular document extractor architecture (`BaseExtractor.js`, `PdfExtractor.js`).
- [x] Added file validation: MIME check, raw binary magic byte inspection (`%PDF-`), and file size limits (10 MB).
- [x] Built end-to-end pipeline service (`pipelineService.js`): Upload ➔ Extract ➔ Save Material ➔ AI Study Kit Synthesis ➔ AI Quiz Synthesis ➔ Return Status.

### Phase 6: Production Frontend & UX (Completed)
- [x] Built React + Vite application with Tailwind CSS and Lucide React icons.
- [x] Implemented pages: Landing, Login, Register, Dashboard, Upload Material, Processing, Study Session, Quiz, Results, Profile, Not Found.
- [x] Built progressive disclosure tabs in Study Session (Overview, Topics, Glossaries, Exam Tips).
- [x] Built interactive quiz engine with question steppers, lettered option buttons, clear selection actions, and submission evaluation.
- [x] Implemented score evaluation screens with topic accuracy breakdown bars and weak topic recommendations.

### Phase 7: Security Hardening & QA Audit (Completed)
- [x] Audit pass: Added Helmet security headers, Express rate limiting, CORS configuration, and strict `{ _id, userId }` authorization checks.
- [x] Verified zero API key leakage to frontend.
- [x] Conducted 100% passing QA audit test suite (`110/110 assertions passing` across `qa_audit.test.js`, `workflow.test.js`, `api.test.js`, `gemini.test.js`, `pipeline.test.js`).
- [x] Visual polish pass: Refined typography, focus-visible rings (`focus-visible:ring-2 focus-visible:ring-brand-500`), container borders, responsive mobile drawer navigation, and Vite production build (`npm run build` completed cleanly in 2.31s).

---

## 3. Verification & Quality Assurance Summary

| Test Suite | Assertions | Status |
| :--- | :---: | :---: |
| `qa_audit.test.js` | 18 / 18 | **PASSED** |
| `workflow.test.js` | 31 / 31 | **PASSED** |
| `api.test.js` | 28 / 28 | **PASSED** |
| `gemini.test.js` | 17 / 17 | **PASSED** |
| `pipeline.test.js` | 16 / 16 | **PASSED** |
| **Total Automated Tests** | **110 / 110** | **100% PASSED** |
| `npm run build` (Frontend) | Clean `dist/` bundle | **SUCCEEDED** |
