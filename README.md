# Preply

> An AI-powered student workspace engineered for grounded exam preparation through active recall, automated study kits, diagnostic quizzes, and targeted weak-topic revision.

---

## Problem

Students frequently struggle with exam preparation due to unstructured study notes, passive reading habits, and a lack of immediate, topic-level self-assessment. While modern generative AI tools exist, generic chatbots often produce ungrounded, untrusted "hallucinations," lack structured study workflows, and require continuous manual prompting rather than guiding students through an integrated learning journey.

---

## Solution

**Preply** solves this problem by providing a single, continuous, grounded end-to-end exam preparation workspace. Students upload raw PDF course materials (lecture slides, textbook chapters, or revision notes). Preply extracts the plain text, processes it through Google Gemini AI with strict fact-grounding system directives, and automatically synthesizes:
1. **Executive Study Kits**: Overview, prioritized key topics, terminology glossaries, and exam-focused points.
2. **Interactive Practice Quizzes**: Multiple-choice questions with answer keys and text-derived explanations.
3. **Automated Performance Diagnostics**: Instant scoring, topic-level accuracy tracking, and weak-topic detection (<70% accuracy).
4. **Targeted Revision Strategies**: Actionable revision guidance linking weak areas directly back to source concepts.

---

## Core Workflow

```text
Upload PDF
  │
  ▼
Extract & Validate Text
  │
  ▼
AI Material Analysis
  │
  ▼
Generate Study Kit & Quiz
  │
  ▼
Take Interactive Quiz
  │
  ▼
Evaluate Score & Accuracy
  │
  ▼
Identify Weak Topics (<70%)
  │
  ▼
Targeted Revision Strategy
```

---

## Features

- **📄 Document Upload & Processing**: Drag-and-drop PDF upload with MIME validation, PDF magic header inspection (`%PDF-`), and file size limits (up to 10 MB).
- **🧠 Grounded AI Study Kits**: Automated extraction of summaries, key topics by priority (High/Medium/Low), concept explanations with examples, and terminology glossaries.
- **📝 Interactive Quiz Engine**: Real-time multiple-choice quizzes with question steppers, lettered option selection (A/B/C/D), clear selection actions, and submission evaluation.
- **📊 Topic Accuracy Diagnostics**: Performance breakdown calculating exact percentage accuracy per topic tag.
- **⚠️ Weak-Topic Detection & Strategy**: Automated tagging of topics falling below the 70% mastery threshold with recommended revision strategies.
- **🔑 Student Authentication & Profile**: Secure JWT authentication, password hashing (`bcryptjs`), user preferences (difficulty selection, notification toggles), and quick demo evaluator sign-in.
- **♿ Accessible Modern Interface**: High-contrast, responsive UI with visible keyboard focus indicators (`focus-visible:ring-2 focus-visible:ring-brand-500`) and drawer navigation for mobile devices.

---

## Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 18, Vite 5, Tailwind CSS 3, Lucide React, React Router v6 |
| **Backend API** | Node.js, Express 4.19, Layered RESTful Architecture (Routes, Controllers, Services, Models) |
| **Database** | MongoDB 6.0+, Mongoose 8.5 ODM |
| **AI Integration** | Google Gemini API (`@google/genai` SDK) |
| **Document Processing**| `pdf-parse` |
| **Security & Middleware**| Helmet 7, CORS, Express-Rate-Limit 7, bcryptjs, JSON Web Tokens (JWT), Joi Validation |

---

## Architecture

Preply enforces strict separation of concerns across a 4-tier architecture:

- **Frontend Tier (`/frontend`)**: A React Single Page Application (SPA) built with Vite and Tailwind CSS. Communicates with the backend strictly via authenticated HTTP REST calls using Axios/Fetch APIs.
- **Backend Tier (`/backend`)**: An Express.js application organized into a layered architecture: `Route → Controller → Validation Middleware → Service → Repository/Model → Database`.
- **Database Tier (`/database`, `/backend/src/models`)**: Dynamic document storage powered by MongoDB and Mongoose ODM models (`User`, `StudyMaterial`, `StudySession`, `Quiz`, `QuizAttempt`).
- **AI Processing Tier (`/backend/src/services/geminiService.js`)**: Server-side Google Gemini SDK integration. API keys remain strictly on the server and are never exposed to client applications.

---

## AI & Prompting

Google Gemini is integrated on the backend service layer to analyze uploaded documents and generate structured study artifacts:

- **Fact Grounding Directive**: All prompts prefix a mandatory system directive instructing Gemini to rely *strictly* on the provided PDF text and omit outside inventions or unsupported claims.
- **Structured JSON Responses**: Prompts utilize explicit JSON schema definitions to ensure deterministic outputs for study kits, quizzes, and revision plans.
- **Response Validation & Sanitization**: `aiResponseValidator.js` strips markdown code fences, converts string indices to numbers, and validates response schemas before persistence.
- **Mock Fallback Engine**: If `GEMINI_API_KEY` is omitted, the service gracefully switches to deterministic mock responses for offline or local testing.

---

## Database

Data is dynamically persisted in MongoDB via Mongoose models:

- **`User`**: Stores student credentials, hashed passwords (`select: false`), and preferences.
- **`StudyMaterial`**: Stores original file metadata, processing status, and raw extracted document text.
- **`StudySession`**: Stores AI-generated study kit content (summaries, key topics, glossaries, exam tips).
- **`Quiz`**: Stores practice quiz questions, multiple-choice options, correct option indices, explanations, and topic tags.
- **`QuizAttempt`**: Stores student responses, calculated scores, overall percentage, per-topic accuracy percentages, and weak topics list.

---

## Security

- **Server-Only API Key**: `GEMINI_API_KEY` is loaded exclusively into server environment variables. Zero AI keys are exposed in frontend client code or bundle artifacts.
- **Magic Header File Inspection**: Uploaded PDFs are validated against MIME constraints and raw binary magic bytes (`%PDF-`) to block malicious uploads.
- **Password Security**: Passwords are hashed using `bcryptjs` with salt rounds. Password fields are excluded from Mongoose query responses by default (`select: false`).
- **Authorization Scoping**: All resource lookup queries enforce `{ _id: id, userId: req.user.id }` to prevent cross-tenant data access.
- **HTTP Hardening**: Helmet security headers, restrictive CORS policies, and Express rate limiting to prevent API abuse.

---

## Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/preply`) or MongoDB Atlas URI
- **Google Gemini API Key**: Optional for live AI generation (fallback mock mode available)

### Installation Commands

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Preply.git
   cd Preply
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Create `backend/.env` based on `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/preply
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_google_gemini_api_key_here
MAX_FILE_SIZE_MB=10
ALLOWED_CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration (`frontend/.env`)

Create `frontend/.env` based on `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## Running the Application

### Option A: Run Backend and Frontend Concurrently

1. **Start Backend API Server**:
   ```bash
   cd backend
   npm start
   ```
   *Backend runs on `http://localhost:5000`*

2. **Start Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Frontend runs on `http://localhost:5173`*

3. Open your browser and navigate to `http://localhost:5173`. You can click **Quick Demo Sign-In** on the login page for instant access!

---

## Testing

### Automated Backend Audit Test Suite
Execute the full QA reliability test suite (covering authentication, resource authorization boundaries, invalid ObjectIDs, non-PDF magic byte upload rejection, AI sanitization, and Helmet headers):

```bash
cd backend
node src/tests/qa_audit.test.js
```

### Automated Integration & Pipeline Test Suites
```bash
cd backend
node src/tests/workflow.test.js
node src/tests/api.test.js
node src/tests/gemini.test.js
node src/tests/pipeline.test.js
```

### Production Frontend Build Verification
```bash
cd frontend
npm run build
```

---

## Deployment

### Production Requirements
- **Node.js Runtime**: Production Node.js 18+ server.
- **MongoDB Database**: MongoDB Atlas instance with replica sets and TLS enabled.
- **Environment Variables**: Configure secure `JWT_SECRET`, `GEMINI_API_KEY`, and `MONGODB_URI` in production secret management.
- **Static Assets Hosting**: Serve `frontend/dist` via Nginx, Vercel, Netlify, or AWS CloudFront.
- **Reverse Proxy**: Use Nginx or AWS ALB to terminate SSL/TLS and route `/api/v1` requests to Node.js backend.

---

## Limitations

- **Scanned PDF Bitmaps**: PDF documents consisting purely of scanned images without embedded text layers require OCR pre-processing. Non-text PDFs are rejected with a clear 400 Bad Request message.
- **Primary Supported Format**: The current upload pipeline supports PDF documents. The underlying modular extractor architecture (`BaseExtractor.js`) is designed to support DOCX and PPTX extractors in future releases.
- **Rate Limits**: Free-tier Gemini API usage is subject to provider rate limits (15 RPM). Preply includes rate limiting and retry handling to manage these bounds.
