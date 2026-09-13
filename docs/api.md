# Preply REST API Documentation Specification

- **Base URL**: `/api/v1`
- **Authentication**: Stateless JWT token in header: `Authorization: Bearer <token>`
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "Human readable status description",
    "data": { ... }
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "message": "Error description",
    "error": {
      "code": "ERROR_CODE",
      "details": []
    }
  }
  ```

---

## 1. System Health Endpoint

### `GET /api/v1/health`
Public health diagnostic check verifying database connectivity and service uptime.
- **Authentication**: None
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Preply API service is operational",
    "data": {
      "status": "ok",
      "service": "Preply Backend API",
      "version": "1.0.0",
      "timestamp": "2026-09-13T12:00:00.000Z",
      "uptimeSeconds": 120,
      "database": {
        "status": "connected",
        "connected": true,
        "host": "localhost",
        "port": 27017,
        "name": "preply"
      }
    }
  }
  ```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Registers a new student account and returns a signed JWT token.
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "name": "Alex Student",
    "email": "alex@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Alex Student",
        "email": "alex@university.edu",
        "role": "student"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### `POST /api/v1/auth/login`
Authenticates student credentials and returns a signed JWT token.
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "alex@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User authenticated successfully",
    "data": {
      "user": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Alex Student",
        "email": "alex@university.edu",
        "role": "student"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### `POST /api/v1/auth/logout`
Logs out current user session.
- **Authentication**: Bearer Token
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User logged out successfully",
    "data": null
  }
  ```

### `GET /api/v1/auth/me`
Retrieves currently authenticated user profile.
- **Authentication**: Bearer Token
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Alex Student",
        "email": "alex@university.edu",
        "role": "student"
      }
    }
  }
  ```

---

## 3. Study Materials Endpoints (`/api/v1/materials`)

### `POST /api/v1/materials/upload`
Uploads a PDF document via multipart form data, validates raw binary magic bytes (`%PDF-`), extracts plain text, invokes Gemini AI to generate study kit & practice quiz, and returns complete workflow results.
- **Authentication**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF file buffer (Max 10 MB)
  - `title`: (Optional) Session Title
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Document uploaded, extracted, and study session generated successfully",
    "data": {
      "material": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "title": "Operating Systems Chapter 4",
        "originalFileName": "os_ch4.pdf",
        "processingStatus": "completed",
        "fileSize": 2457600
      },
      "studySession": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d3",
        "title": "Study Kit: Operating Systems Chapter 4",
        "summary": "Process synchronization ensures concurrent execution without race conditions."
      },
      "quiz": {
        "id": "65f1a2b3c4d5e6f7a8b9c0d4",
        "title": "Quiz: Operating Systems Chapter 4",
        "questionsCount": 5
      }
    }
  }
  ```

### `POST /api/v1/materials`
Creates a study material document metadata record directly via JSON.
- **Authentication**: Bearer Token

### `GET /api/v1/materials`
Lists authenticated user's study materials with pagination & search filtering.
- **Authentication**: Bearer Token
- **Query Params**: `page` (default 1), `limit` (default 10), `search`, `subject`

### `GET /api/v1/materials/:id`
Retrieves a single study material by ID (scoped to authenticated user).
- **Authentication**: Bearer Token

### `DELETE /api/v1/materials/:id`
Deletes a study material by ID (scoped to authenticated user).
- **Authentication**: Bearer Token

---

## 4. Study Sessions Endpoints (`/api/v1/study-sessions`)

### `POST /api/v1/study-sessions`
Creates an AI-synthesized study session kit linked to a study material.
- **Authentication**: Bearer Token

### `GET /api/v1/study-sessions`
Lists user's study sessions with pagination.
- **Authentication**: Bearer Token

### `GET /api/v1/study-sessions/:id`
Retrieves full structured study session details (summary, key topics, glossaries, exam tips).
- **Authentication**: Bearer Token

---

## 5. Quiz & Attempt Endpoints (`/api/v1/quizzes`)

### `GET /api/v1/quizzes/:id`
Retrieves quiz questions for a test session (or `:id = latest` for the user's most recent quiz).
- **Authentication**: Bearer Token

### `POST /api/v1/quizzes/:id/attempts`
Submits student answers, evaluates accuracy per topic tag, and pinpoints weak areas (<70% accuracy).
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "answers": [
      { "questionId": "q1", "selectedOptionIndex": 3, "timeSpentSeconds": 14 }
    ],
    "timeTakenSeconds": 45
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Quiz attempt evaluated successfully",
    "data": {
      "attempt": {
        "id": "att_999",
        "score": 4,
        "percentage": 80,
        "topicWisePerformance": [
          { "topicTag": "Process Synchronization", "accuracyPercentage": 100 }
        ],
        "weakTopics": ["Deadlock Handling"]
      }
    }
  }
  ```

### `GET /api/v1/quizzes/:id/attempts`
Retrieves attempt history for a specific quiz.
- **Authentication**: Bearer Token

### `GET /api/v1/quizzes/attempt/:attemptId`
Retrieves a specific quiz attempt result by attempt ID.
- **Authentication**: Bearer Token

---

## 6. Dashboard Endpoint (`/api/v1/dashboard`)

### `GET /api/v1/dashboard`
Returns student workspace aggregate statistics, weak topics list, recent materials, and recent attempts.
- **Authentication**: Bearer Token
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "materialsCount": 4,
        "sessionsCount": 3,
        "quizzesCount": 3,
        "attemptsCount": 5,
        "averageScorePercentage": 78
      },
      "weakTopics": ["Deadlock Handling"],
      "recentMaterials": [],
      "recentAttempts": []
    }
  }
  ```
