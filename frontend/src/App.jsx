import { useState, useEffect } from 'react';
import { INITIAL_USERS, INITIAL_COURSES_WITH_CHAPTERS, INITIAL_QUIZ_ATTEMPTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './pages/StudentDashboard';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SchoolLogo } from './components/SchoolLogo';
import { api } from './services/api';

const loadStoredUsers = () => {
  try {
    const stored = window.localStorage.getItem('shire-jama-users');
    return stored ? JSON.parse(stored) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
};

export default function App() {
  const [users, setUsers] = useState(loadStoredUsers);
  const [courses, setCourses] = useState(INITIAL_COURSES_WITH_CHAPTERS);
  const [attempts, setAttempts] = useState(INITIAL_QUIZ_ATTEMPTS);
  const [currentUser, setCurrentUser] = useState(null);

  // Load courses after authentication so instructor ownership uses backend IDs.
  useEffect(() => {
    if (!currentUser) return;
    async function loadData() {
      try {
        const liveCourses = await api.getCourses();
        setCourses(liveCourses || []);
      } catch {
        // Seamless fallback to local default courses
      }
    }
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    api.getQuizResults().then(setAttempts).catch(() => {});
  }, [currentUser]);

  // Authentication Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    api.clearTokens();
    setCurrentUser(null);
  };

  const handleQuizSubmit = (attempt) => {
    setAttempts((prev) => [attempt, ...prev.filter((item) => item.id !== attempt.id)]);
    api.getQuizResults().then(setAttempts).catch(() => {});
  };

  const handleUpdateAttempt = (updatedAttempt) => {
    setAttempts((prev) => prev.map((attempt) => attempt.id === updatedAttempt.id ? updatedAttempt : attempt));
    api.getQuizResults().then(setAttempts).catch(() => {});
  };

  // Instructor Actions
  const handleCreateCourse = (newCourse) => {
    setCourses((prev) => [newCourse, ...prev]);
  };

  const handleUpdateCourse = (updatedCourse) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
  };

  const handleDeleteCourse = (courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  // Admin Actions
  const handleAddInstructor = (newInstructor) => {
    setUsers((prev) => [...prev, newInstructor]);
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers((prev) => {
      const updated = prev.map((user) => (user.id === updatedUser.id ? updatedUser : user));
      window.localStorage.setItem('shire-jama-users', JSON.stringify(updated));
      return updated;
    });
    setCurrentUser((current) => current?.id === updatedUser.id ? updatedUser : current);
  };

  const handleToggleUserStatus = (userId) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const handleResetPassword = (userId, newPass) => {
    console.log(`Password reset for user ${userId}: ${newPass}`);
  };

  const accessibleCourses = currentUser?.role === 'STUDENT'
    ? courses
        .map((course) => ({
          ...course,
          materials: course.materials,
          chapters: course.chapters,
        }))
        .filter((course) => course.academicLevels?.includes(currentUser.academicLevel))
    : courses;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        currentUser={currentUser}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser && (
          <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-slate-200 mt-4">
            <div className="flex justify-center mb-6">
              <SchoolLogo size={96} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-serif">
              Shire Jama Learning Management System
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Access your courses, learning materials, and assessment progress in one place.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <p className="text-sm font-semibold text-emerald-800 bg-emerald-50 py-2.5 px-5 rounded-full border border-emerald-200 shadow-sm">
                Click &quot;Sign In / Portal Access&quot; in the header above to begin learning or instructing.
              </p>
            </div>
          </div>
        )}

        {currentUser?.role === 'STUDENT' && (
          <StudentDashboard
            student={currentUser}
            courses={accessibleCourses}
            attempts={attempts}
            onQuizSubmit={handleQuizSubmit}
          />
        )}

        {currentUser?.role === 'INSTRUCTOR' && (
          <InstructorDashboard
            instructor={currentUser}
            courses={courses}
            onCreateCourse={handleCreateCourse}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
            allAttempts={attempts}
            onUpdateAttempt={handleUpdateAttempt}
          />
        )}

        {currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            adminUser={currentUser}
            users={users}
            courses={courses}
            attempts={attempts}
            onAddInstructor={handleAddInstructor}
            onUpdateUser={handleUpdateUser}
            onToggleUserStatus={handleToggleUserStatus}
            onResetPassword={handleResetPassword}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>Shire Jama Learning Center &copy; {new Date().getFullYear()} — Institutional LMS Architecture.</p>
      </footer>
    </div>
  );
}