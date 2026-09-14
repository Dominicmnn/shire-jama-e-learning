import { AcademicLevel, Course, Quiz, QuizAttempt, User } from '../types';
import { Chapter } from '../types';
import { INITIAL_USERS, INITIAL_COURSES_WITH_CHAPTERS } from '../data/mockData';

const tokenStorageKey = 'shire-jama-auth-tokens';
const progressStorageKey = 'shire-jama-chapter-progress';
const usersStorageKey = 'shire-jama-users';
const createdQuizzesStorageKey = 'shire-jama-created-quizzes';
// @ts-ignore
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api') as string;

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
      console.log('[API] No authentication token found. Using mock data. Please log in with backend credentials to access database.');
      return Promise.resolve(cloneCourses());
    }
    try {
      const summaries = await apiRequest('/courses/');
      return Promise.all(summaries.map((course: Course) => apiRequest(`/courses/${course.id}/`)));
    } catch (error) {
      console.warn('[API] Failed to get courses from backend:', error);
      console.log('[API] Falling back to mock data');
      return Promise.resolve(cloneCourses());
    }
  },

  login: async (identifier: string, password: string) => {
    const result = await apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify({ username: identifier, password }) });
    window.localStorage.setItem(tokenStorageKey, JSON.stringify({ access: result.access, refresh: result.refresh }));
    return { ...result, user: normalizeUser(result.user) };
  },

  adminProvisionStudent: async (payload: { fullName: string; email: string; username: string; password: string; studentId?: string; academicLevel: AcademicLevel }) => {
    ensureTokens();
    const emailTrimmed = payload.email.trim().toLowerCase();
    const storedUsers = getStoredUsers();
    const existing = storedUsers.find((user) => user.email.toLowerCase() === emailTrimmed);
    if (existing) {
      return Promise.reject(new Error('User already exists'));
    }

    const idSuffix = Math.floor(100 + Math.random() * 900);
    const newStudent: User = {
      id: `u-std-${Date.now()}`,
      username: payload.username.trim() || emailTrimmed.split('@')[0],
      fullName: payload.fullName.trim(),
      email: emailTrimmed,
      role: 'STUDENT',
      isActive: true,
      dateJoined: new Date().toISOString().split('T')[0],
      studentId: payload.studentId || `STD-${new Date().getFullYear()}-${idSuffix}`,
      academicLevel: payload.academicLevel,
    };

    storeUsers([...storedUsers, newStudent]);
    return Promise.resolve(newStudent);
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
    try {
      return await apiRequest(`/courses/${courseId}/chapters/`, { method: 'POST', body: JSON.stringify({ title: title.trim() }) });
    } catch (error) {
      // Fallback: create chapter locally if course is local or API fails
      const localChapter: Chapter = {
        id: `ch-${Date.now()}`,
        courseId,
        title: title.trim(),
        order: 1,
        materials: [],
        quizzes: [],
      };
      console.warn('Chapter creation via API failed, using local fallback:', error);
      return Promise.resolve(localChapter);
    }
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
    
    try {
      return await apiRequest(`/courses/${courseId}/quizzes/`, { method: 'POST', body: formData });
    } catch (error) {
      // Fallback: create quiz locally if API fails or course is local
      console.warn('Quiz creation via API failed, using local fallback:', error);
      const localQuiz: Quiz = {
        id: `qz-${Date.now()}`,
        courseId,
        title: title.trim(),
        instructions: '',
        passingScorePercent: 70,
        resultsVisibleToStudents,
        questions: questions.map((q) => ({ ...q, questionFileUrl: q.questionFileUrl || undefined, questionFileName: q.questionFileName || undefined })),
        chapterId,
        isTimed,
        timeLimitMinutes: timeLimitMinutes || undefined,
        opensAt: opensAt || undefined,
        closesAt: closesAt || undefined,
      };
      return Promise.resolve(localQuiz);
    }
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

  getQuizResults: async (): Promise<QuizAttempt[]> => apiRequest('/quiz-results/'),

  gradeQuizAttempt: async (attemptId: string, score: number, feedback: string) => apiRequest(`/quiz-attempts/${attemptId}/grade/`, { method: 'POST', body: JSON.stringify({ score, feedback }) }),

  adminProvisionInstructor: async (payload: { fullName: string; email: string; instructorCode?: string; temporaryPassword: string }) => {
    ensureTokens();
    const newInstructor: User = {
      id: `u-inst-${Date.now()}`,
      username: payload.email.split('@')[0],
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      role: 'INSTRUCTOR',
      isActive: true,
      dateJoined: new Date().toISOString().split('T')[0],
      instructorCode: payload.instructorCode || `INST-${Math.floor(100 + Math.random() * 900)}`,
    };
    return Promise.resolve(newInstructor);
  },

  adminToggleStatus: async (userId: string) => {
    ensureTokens();
    return Promise.resolve({ userId, isActive: true });
  },

  adminResetPassword: async (userId: string, newPassword: string) => {
    ensureTokens();
    return Promise.resolve({ userId, newPassword });
  },

  adminUpdateUser: async (userId: string, user: User): Promise<User> => {
    ensureTokens();
    const updatedUser = { ...user, id: userId };
    storeUsers(getStoredUsers().map((storedUser) => storedUser.id === userId ? updatedUser : storedUser));
    return Promise.resolve(updatedUser);
  },
};

export default api;
