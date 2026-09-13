const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

let authToken = localStorage.getItem('preply_auth_token') || '';

export const setAuthToken = (token) => {
  authToken = token || '';
  if (token) {
    localStorage.setItem('preply_auth_token', token);
  } else {
    localStorage.removeItem('preply_auth_token');
  }
};

export const getAuthToken = () => {
  return authToken || localStorage.getItem('preply_auth_token') || '';
};

const customFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('preply:unauthorized'));
        }
      }
      throw new Error(data.message || `HTTP Error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[API Service Error] ${endpoint}:`, error.message);
    throw error;
  }
};

// Authentication Endpoints
export const authAPI = {
  register: (name, email, password) =>
    customFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email, password) =>
    customFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => customFetch('/auth/me'),
  logout: () => customFetch('/auth/logout', { method: 'POST' }),
};

// Study Materials Endpoints
export const materialsAPI = {
  uploadDocument: (file, title = '', preferences = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (preferences.subject) formData.append('subject', preferences.subject);
    if (preferences.studyGoal) formData.append('studyGoal', preferences.studyGoal);
    if (preferences.studyTime) formData.append('studyTime', preferences.studyTime);
    if (preferences.targetDifficulty) formData.append('targetDifficulty', preferences.targetDifficulty);

    return customFetch('/materials/upload', {
      method: 'POST',
      body: formData,
    });
  },
  getMaterials: (page = 1, limit = 10, search = '') =>
    customFetch(`/materials?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  getMaterial: (id) => customFetch(`/materials/${id}`),
  deleteMaterial: (id) => customFetch(`/materials/${id}`, { method: 'DELETE' }),
};

// Study Sessions Endpoints
export const sessionsAPI = {
  getSessions: (page = 1, limit = 10) =>
    customFetch(`/study-sessions?page=${page}&limit=${limit}`),
  getSession: (id) => customFetch(`/study-sessions/${id}`),
  explainConcept: (sessionId, concept, explanationMode, existingExplanation = '') =>
    customFetch(`/study-sessions/${sessionId}/explain`, {
      method: 'POST',
      body: JSON.stringify({ concept, explanationMode, existingExplanation }),
    }),
};

// Quiz & Attempt Endpoints
export const quizAPI = {
  getQuiz: (id = 'latest') => customFetch(`/quizzes/${id}`),
  getNextQuestion: (id = 'latest', currentAnswers = []) =>
    customFetch(`/quizzes/${id}/next-question`, {
      method: 'POST',
      body: JSON.stringify({ currentAnswers }),
    }),
  submitAttempt: (quizId = 'latest', answers, timeTakenSeconds = 0) =>
    customFetch(`/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeTakenSeconds }),
    }),
  getAttempts: (quizId = 'latest') => customFetch(`/quizzes/${quizId}/attempts`),
  getAttempt: (attemptId = 'latest') => customFetch(`/quizzes/attempt/${attemptId}`),
};

// Dashboard Endpoint
export const dashboardAPI = {
  getDashboard: () => customFetch('/dashboard'),
};
