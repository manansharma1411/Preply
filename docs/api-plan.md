# Preply - REST API Plan & Specification

## 1. API Architecture Standards

- **Base URL**: `http://localhost:5000/api/v1`
- **Format**: Standardized JSON responses
- **Authentication**: Stateless JWT token passed in headers (`Authorization: Bearer <token>`)
- **Content Type**: `application/json` (except document upload: `multipart/form-data`)

---

## 2. Standardized Response Format

### Success Response Syntax
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Syntax
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "ERROR_CODE_NAME",
    "details": []
  }
}
```

---

## 3. Endpoint Specifications

### 3.1 Authentication Routes (`/auth`)

#### `POST /api/v1/auth/register`
Creates a new student account.
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
    "message": "Account created successfully",
    "data": {
      "user": { "id": "usr_123", "name": "Alex Student", "email": "alex@university.edu" },
      "token": "eyJhbGciOi..."
    }
  }
  ```

#### `POST /api/v1/auth/login`
Authenticates a user.
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
    "data": {
      "user": { "id": "usr_123", "name": "Alex Student", "email": "alex@university.edu" },
      "token": "eyJhbGciOi..."
    }
  }
  ```

---

### 3.2 Document Upload & Parsing Routes (`/documents`)

#### `POST /api/v1/documents/upload`
Uploads and extracts text from a PDF study document.
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: PDF file (max 10MB)
  - `title`: (Optional) Custom title
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Document uploaded and text extracted successfully",
    "data": {
      "document": {
        "id": "doc_456",
        "title": "Operating Systems Chapter 4",
        "fileName": "os_ch4.pdf",
        "fileSize": 2451200,
        "pageCount": 18,
        "wordCount": 4320,
        "createdAt": "2026-09-13T12:00:00Z"
      }
    }
  }
  ```

#### `GET /api/v1/documents`
Lists user's uploaded documents.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "documents": [ { "id": "doc_456", "title": "Operating Systems Chapter 4", "pageCount": 18 } ]
    }
  }
  ```

---

### 3.3 Study Material Routes (`/materials`)

#### `POST /api/v1/materials/generate/:documentId`
Triggers Gemini AI analysis and generates structured study material.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Study material generated successfully",
    "data": {
      "studyMaterial": {
        "id": "mat_789",
        "documentId": "doc_456",
        "summary": "Detailed executive summary of the document...",
        "keyConcepts": [
          {
            "topic": "Process Synchronization",
            "explanation": "Mechanism to prevent race conditions...",
            "importance": "High"
          }
        ],
        "flashcards": [
          { "front": "What is a mutex?", "back": "A mutual exclusion lock object." }
        ],
        "glossary": [
          { "term": "Semaphores", "definition": "Signaling mechanism for concurrent processes." }
        ]
      }
    }
  }
  ```

#### `GET /api/v1/materials/document/:documentId`
Retrieves existing study material for a document.

---

### 3.4 Quiz Routes (`/quizzes`)

#### `POST /api/v1/quizzes/generate/:documentId`
Triggers Gemini AI to construct a targeted quiz based on extracted document concepts.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Quiz generated successfully",
    "data": {
      "quiz": {
        "id": "quiz_101",
        "documentId": "doc_456",
        "totalQuestions": 5,
        "questions": [
          {
            "id": "q1",
            "question": "Which mechanism guarantees mutual exclusion?",
            "options": ["Spinlock", "Mutex", "Semaphore", "All of the above"],
            "topicTag": "Process Synchronization",
            "difficulty": "Medium"
          }
        ]
      }
    }
  }
  ```

---

### 3.5 Quiz Evaluation & Attempt Routes (`/attempts`)

#### `POST /api/v1/attempts/submit`
Evaluates student quiz submission, computes score, topic accuracy, and identifies weak areas.
- **Request Body**:
  ```json
  {
    "quizId": "quiz_101",
    "answers": [
      { "questionId": "q1", "selectedOptionIndex": 1 },
      { "questionId": "q2", "selectedOptionIndex": 0 }
    ],
    "timeTakenSeconds": 180
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Quiz evaluated successfully",
    "data": {
      "attempt": {
        "id": "att_202",
        "quizId": "quiz_101",
        "totalQuestions": 5,
        "correctCount": 3,
        "scorePercentage": 60.0,
        "topicBreakdown": [
          { "topic": "Process Synchronization", "correct": 2, "total": 2, "accuracyPercentage": 100.0 },
          { "topic": "Deadlock Handling", "correct": 0, "total": 2, "accuracyPercentage": 0.0 }
        ],
        "weakTopics": ["Deadlock Handling"]
      }
    }
  }
  ```

---

### 3.6 Revision Recommendation Routes (`/recommendations`)

#### `GET /api/v1/recommendations/attempt/:attemptId`
Retrieves AI-generated revision recommendations targeted specifically at the student's identified weak topics.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "recommendations": {
        "attemptId": "att_202",
        "weakTopics": ["Deadlock Handling"],
        "revisionActions": [
          {
            "topic": "Deadlock Handling",
            "priority": "High",
            "summary": "Focus on the 4 necessary conditions for deadlock (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait).",
            "suggestedFlashcards": ["What are the 4 conditions for deadlock?"],
            "keyTakeaway": "Remember that breaking any ONE condition prevents deadlock."
          }
        ]
      }
    }
  }
  ```
