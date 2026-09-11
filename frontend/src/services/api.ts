import { AcademicLevel, Course, Quiz, QuizAttempt, User } from '../types';
import { Chapter } from '../types';
import { INITIAL_USERS, INITIAL_COURSES_WITH_CHAPTERS } from '../data/mockData';

const tokenStorageKey = 'shire-jama-auth-tokens';
const progressStorageKey = 'shire-jama-chapter-progress';
const usersStorageKey = 'shire-jama-users';
const createdQuizzesStorageKey = 'shire-jama-created-quizzes';

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
  if (!existing) {
    window.localStorage.setItem(tokenStorageKey, JSON.stringify({ access: 'demo-token', refresh: 'demo-refresh-token' }));
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
    ensureTokens();
    return Promise.resolve(cloneCourses());
  },

  login: async (identifier: string, password: string) => {
    ensureTokens();
    const matchedUser = findUserByCredentials(identifier, password);
    if (!matchedUser) {
      return Promise.reject(new Error('Invalid credentials'));
    }
    return Promise.resolve({ user: matchedUser, accessToken: 'demo-token', refreshToken: 'demo-refresh-token' });
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
    ensureTokens();
    const newCourse: Course = {
      id: `c-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      instructorId: instructor.id,
      instructorName: instructor.fullName,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      materials: [],
      quizzes: [],
      chapters: [],
      academicLevels,
    };
    return Promise.resolve(newCourse);
  },

  uploadMaterial: async (courseId: string, formData: FormData) => {
    ensureTokens();
    const title = String(formData.get('title') ?? 'Uploaded material');
    const file = formData.get('file');
    const fileUrl = typeof file === 'string' ? file : `https://example.com/${title.replace(/\s+/g, '-').toLowerCase()}`;
    return Promise.resolve({
      id: `m-${Date.now()}`,
      courseId,
      title,
      type: String(formData.get('type') ?? 'PDF'),
      fileName: file && typeof file !== 'string' ? (file as File).name : 'uploaded-file',
      fileUrl,
      chapterId: String(formData.get('chapterId') ?? ''),
      allowDownload: String(formData.get('allowDownload') ?? 'false') === 'true',
    });
  },

  createChapter: async (courseId: string, title: string): Promise<Chapter> => {
    ensureTokens();
    return Promise.resolve({ id: `ch-${Date.now()}`, courseId, title: title.trim(), order: Date.now(), materials: [], quizzes: [] });
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
  ): Promise<Quiz> => {
    ensureTokens();
    const quiz = { id: `q-${Date.now()}`, courseId, chapterId, title: title.trim(), instructions: '', passingScorePercent: 70, resultsVisibleToStudents, questions, isTimed, timeLimitMinutes: isTimed ? timeLimitMinutes : null, opensAt, closesAt };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(createdQuizzesStorageKey, JSON.stringify([...getCreatedQuizzes(), quiz]));
    }
    return Promise.resolve(quiz);
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
    ensureTokens();
    const seededQuiz = INITIAL_COURSES_WITH_CHAPTERS.flatMap((entry) => entry.quizzes).find((quiz) => quiz.id === quizId);
    const quiz = seededQuiz || getCreatedQuizzes().find((entry) => entry.id === quizId);
    const totalQuestions = quiz?.questions.length ?? 0;
    let correct = 0;

    quiz?.questions.forEach((question) => {
      const selected = answers[question.id];
      const correctChoice = question.choices.find((choice) => choice.isCorrect);
      if (selected && correctChoice && selected === correctChoice.id) {
        correct += 1;
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    Object.entries(answerFiles).forEach(([questionId, file]) => {
      if (file) answers[questionId] = answers[questionId] || '';
    });

    return Promise.resolve({
      attemptId: `att-${Date.now()}`,
      resultAvailable: quiz?.resultsVisibleToStudents === true,
      score: correct,
      totalQuestions,
      percentage,
      completedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
  },

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
