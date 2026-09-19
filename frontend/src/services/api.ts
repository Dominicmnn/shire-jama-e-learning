import { AcademicLevel, Course, Quiz, QuizAttempt, User } from '../types';
import { Chapter } from '../types';
import { INITIAL_USERS, INITIAL_COURSES_WITH_CHAPTERS } from '../data/mockData';

const tokenStorageKey = 'shire-jama-auth-tokens';
const progressStorageKey = 'shire-jama-chapter-progress';
const usersStorageKey = 'shire-jama-users';
const createdQuizzesStorageKey = 'shire-jama-created-quizzes';
const defaultApiUrl = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.origin}/api`
  : 'http://localhost:8000/api';
const configuredApiUrl = (import.meta.env.VITE_API_URL || defaultApiUrl) as string;
const apiBaseUrl = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`;

const getAccessToken = () => {
  if (typeof window === 'undefined') return '';
  try { return JSON.parse(window.localStorage.getItem(tokenStorageKey) || '{}').access || ''; } catch { return ''; }
};

const normalizeUser = (user: any): User => ({
  ...user,
  studentId: user.studentId ?? user.student_id,
  instructorCode: user.instructorCode ?? user.instructor_code,
  academicLevel: user.academicLevel ?? user.academic_level,
  fullName: user.fullName ?? user.full_name ?? user.username,
  isActive: user.isActive ?? user.is_active,
  dateJoined: user.dateJoined ?? user.date_joined,
});

const apiRequest = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const fullUrl = `${apiBaseUrl}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);
  const response = await fetch(fullUrl, { ...options, headers });
  console.log(`[API] Response: ${response.status} ${response.statusText}`);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(tokenStorageKey);
    }
    const errorText = await response.text();
    console.error(`[API ERROR] ${response.status}: ${errorText.substring(0, 200)}`);
    let message = errorText || `Request failed: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      message = errorData.detail || errorData.score?.[0] || message;
    } catch {
      // Keep the raw response when the server did not return JSON.
    }
    throw new Error(`${response.status}: ${message}`);
  }
  return response.status === 204 ? null : response.json();
};

const normalizeQuizAttempt = (attempt: any): QuizAttempt => ({
  ...attempt,
  id: String(attempt.id),
  quizId: String(attempt.quizId ?? attempt.quiz_id),
  studentId: String(attempt.studentId ?? attempt.student_id ?? ''),
  answers: attempt.answers ?? {},
});

const getCreatedQuizzes = (): Quiz[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(createdQuizzesStorageKey) || '[]');
  } catch {
    return [];
  }
};

const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const stored = window.localStorage.getItem(usersStorageKey);
    return stored ? JSON.parse(stored) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
};

const storeUsers = (users: User[]) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(usersStorageKey, JSON.stringify(users));
};

const cloneCourses = (): Course[] => INITIAL_COURSES_WITH_CHAPTERS.map((course) => ({
  ...course,
  materials: course.materials.map((material) => ({ ...material })),
  quizzes: course.quizzes.map((quiz) => ({
    ...quiz,
    questions: quiz.questions.map((question) => ({
      ...question,
      choices: question.choices.map((choice) => ({ ...choice })),
    })),
  })),
  chapters: course.chapters.map((chapter) => ({
    ...chapter,
    materials: chapter.materials.map((material) => ({ ...material })),
    quizzes: chapter.quizzes.map((quiz) => ({ ...quiz, questions: quiz.questions.map((question) => ({ ...question, choices: question.choices.map((choice) => ({ ...choice })) })) })),
  })),
}));

const findUserByCredentials = (identifier: string, password: string) => {
  const normalized = identifier.trim().toLowerCase();
  return getStoredUsers().find((user) => {
    const matchesLogin = user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized;
    const matchesPassword =
      (user.role === 'ADMIN' && password === 'Admin2024!') ||
      (user.role === 'INSTRUCTOR' && password === 'Instructor2024!') ||
      (user.role === 'STUDENT' && password === 'Student2024!') ||
      password === 'ShireJama2024!';

    return matchesLogin && matchesPassword && user.isActive;
  });
};

const ensureTokens = () => {
  if (typeof window === 'undefined') return;
  const existing = window.localStorage.getItem(tokenStorageKey);
  // Only set demo token if no token exists AND we're in development
  // In production, users MUST log in
  if (!existing) {
    console.log('[AUTH] No tokens found. User must log in to use backend features.');
  }
};

export const api = {
  clearTokens: async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(tokenStorageKey);
    }
    return Promise.resolve();
  },

  getCourses: async (): Promise<Course[]> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('You must be signed in to load courses.');
    }
    const summaries = await apiRequest('/courses/');
    return Promise.all(summaries.map((course: Course) => apiRequest(`/courses/${course.id}/`)));
  },

  login: async (identifier: string, password: string) => {
    const result = await apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify({ username: identifier, password }) });
    window.localStorage.setItem(tokenStorageKey, JSON.stringify({ access: result.access, refresh: result.refresh }));
    return { ...result, user: normalizeUser(result.user) };
  },

  adminProvisionStudent: async (payload: { fullName: string; email: string; username: string; password: string; studentId?: string; academicLevel: AcademicLevel }) => {
    const student = await apiRequest('/admin/students/', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        username: payload.username.trim(),
        password: payload.password,
        studentId: payload.studentId?.trim() || undefined,
      }),
    });
    return normalizeUser(student);
  },

  createCourse: async (title: string, description: string, academicLevels: AcademicLevel[], instructor: User) => {
    return apiRequest('/courses/', { method: 'POST', body: JSON.stringify({ title: title.trim(), description: description.trim(), academicLevels }) });
  },

  uploadMaterial: async (courseId: string, formData: FormData) => {
    console.log('Uploading material to course:', courseId);
    if (!courseId || isNaN(Number(courseId))) {
      return Promise.reject(new Error('Invalid course ID. Please ensure the course is saved on the server before uploading materials.'));
    }
    try {
      return await apiRequest(`/courses/${courseId}/materials/`, { method: 'POST', body: formData });
    } catch (error) {
      console.error('Material upload failed:', error);
      throw error;
    }
  },

  createChapter: async (courseId: string, title: string): Promise<Chapter> => {
    return apiRequest(`/courses/${courseId}/chapters/`, { method: 'POST', body: JSON.stringify({ title: title.trim() }) });
  },

  createQuiz: async (
    courseId: string,
    chapterId: string,
    title: string,
    isTimed: boolean,
    timeLimitMinutes?: number,
    questions: Quiz['questions'] = [],
    resultsVisibleToStudents = false,
    opensAt: string | null = null,
    closesAt: string | null = null,
    questionFiles: Record<string, File> = {},
  ): Promise<Quiz> => {
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('chapterId', chapterId);
    formData.append('isTimed', String(isTimed));
    formData.append('timeLimitMinutes', String(timeLimitMinutes || ''));
    formData.append('resultsVisibleToStudents', String(resultsVisibleToStudents));
    if (opensAt) formData.append('opensAt', opensAt);
    if (closesAt) formData.append('closesAt', closesAt);
    formData.append('questions', JSON.stringify(questions.map(({ questionFileUrl, questionFileName, ...question }) => question)));
    Object.entries(questionFiles).forEach(([index, file]) => formData.append(`questionFile_${index}`, file));
    
    return apiRequest(`/courses/${courseId}/quizzes/`, { method: 'POST', body: formData });
  },

  completeChapter: async (courseId: string, chapterId: string) => {
    ensureTokens();
    if (typeof window !== 'undefined') {
      const progress = JSON.parse(window.localStorage.getItem(progressStorageKey) || '{}');
      progress[`${courseId}:${chapterId}`] = true;
      window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    }
    return Promise.resolve({ chapterId, completed: true });
  },

  trackMaterialProgress: async (courseId: string, materialId: string, progressPercent: number) => {
    ensureTokens();
    if (typeof window !== 'undefined') {
      const progress = JSON.parse(window.localStorage.getItem('shire-jama-material-progress') || '{}');
      progress[`${courseId}:${materialId}`] = { opened: true, progressPercent };
      window.localStorage.setItem('shire-jama-material-progress', JSON.stringify(progress));
    }
    return Promise.resolve({ materialId, opened: true, progressPercent });
  },

  submitQuiz: async (quizId: string, answers: Record<string, string>, answerFiles: Record<string, File> = {}) => {
    const formData = new FormData();
    formData.append('answers', JSON.stringify(answers));
    Object.entries(answerFiles).forEach(([questionId, file]) => formData.append(`answerFile_${questionId}`, file));
    return apiRequest(`/quizzes/${quizId}/submit/`, { method: 'POST', body: formData });
  },

  getQuizResults: async (): Promise<QuizAttempt[]> => {
    const attempts = await apiRequest('/quiz-results/');
    return attempts.map(normalizeQuizAttempt);
  },

  gradeQuizAttempt: async (attemptId: string, score: number, feedback: string) => {
    if (!/^\d+$/.test(String(attemptId))) {
      throw new Error('This submission is not linked to a saved server attempt. Refresh the instructor dashboard and try again.');
    }
    return apiRequest(`/quiz-attempts/${attemptId}/grade/`, { method: 'POST', body: JSON.stringify({ score, feedback }) });
  },

  adminProvisionInstructor: async (payload: { fullName: string; email: string; instructorCode?: string; temporaryPassword: string }) => {
    const response = await apiRequest('/admin/instructors/', {
      method: 'POST',
      body: JSON.stringify({
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        instructor_code: payload.instructorCode?.trim() || undefined,
        temporaryPassword: payload.temporaryPassword,
      }),
    });
    return normalizeUser({ ...response.instructor, role: 'INSTRUCTOR', isActive: true });
  },

  adminToggleStatus: async (userId: string) => {
    return apiRequest(`/admin/instructors/${userId}/toggle-status/`, { method: 'POST' });
  },

  adminResetPassword: async (user: User, newPassword: string) => {
    if (!/^\d+$/.test(String(user.id))) {
      if (user.role === 'STUDENT') {
        return api.adminProvisionStudent({
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          password: newPassword,
          studentId: user.studentId,
          academicLevel: user.academicLevel || 'CLASS_1',
        });
      }
      return api.adminProvisionInstructor({
        fullName: user.fullName,
        email: user.email,
        instructorCode: user.instructorCode,
        temporaryPassword: newPassword,
      });
    }
    return apiRequest(`/admin/users/${user.id}/reset-password/`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  adminUpdateUser: async (userId: string, user: User): Promise<User> => {
    const updatedUser = await apiRequest(`/admin/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        studentId: user.studentId,
        academicLevel: user.academicLevel,
        instructorCode: user.instructorCode,
      }),
    });
    return normalizeUser(updatedUser);
  },
};

export default api;
