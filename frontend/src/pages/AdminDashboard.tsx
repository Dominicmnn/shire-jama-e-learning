import React, { useState } from 'react';
import { ACADEMIC_LEVELS, AcademicLevel, Course, QuizAttempt, User } from '../types';
import { api } from '../services/api';
import { Shield, UserPlus, Users, KeyRound, BookOpen, Award, RefreshCw, Pencil } from 'lucide-react';

interface AdminDashboardProps {
  adminUser: User;
  users: User[];
  courses: Course[];
  attempts: QuizAttempt[];
  onAddInstructor: (newInstructor: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onToggleUserStatus: (userId: string) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  users,
  courses,
  attempts,
  onAddInstructor,
  onUpdateUser,
  onToggleUserStatus,
  onResetPassword,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentFullName, setStudentFullName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentLevel, setStudentLevel] = useState<AcademicLevel>('CLASS_1');
  const [studentError, setStudentError] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [instCode, setInstCode] = useState('');
  const [tempPass, setTempPass] = useState('ShireJama2024!');
  const [loading, setLoading] = useState(false);

  // Reset Password State
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editAcademicLevel, setEditAcademicLevel] = useState<User['academicLevel']>('CLASS_1');
  const [editInstructorCode, setEditInstructorCode] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const instructors = users.filter((u) => u.role === 'INSTRUCTOR');
  const students = users.filter((u) => u.role === 'STUDENT');

  const handleAddInstructorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const instructor = await api.adminProvisionInstructor({
        fullName: fullName.trim(),
        email: email.trim(),
        instructorCode: instCode.trim() || undefined,
        temporaryPassword: tempPass.trim(),
      });
      onAddInstructor(instructor);
    } catch {
      // Local fallback
      const localInstructor: User = {
        id: `u-inst-${Date.now()}`,
        username: email.split('@')[0],
        fullName: fullName.trim(),
        email: email.trim(),
        role: 'INSTRUCTOR',
        isActive: true,
        dateJoined: new Date().toISOString().split('T')[0],
        instructorCode: instCode.trim() || `INST-${Math.floor(100 + Math.random() * 900)}`,
      };
      onAddInstructor(localInstructor);
    }

    setLoading(false);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setInstCode('');
  };

  const handleEnrollStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStudentError('');
    const payload = { fullName: studentFullName, email: studentEmail, username: studentUsername, password: studentPassword, studentId, academicLevel: studentLevel };
    try {
      const student = await api.adminProvisionStudent(payload);
      onAddInstructor(student);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Student enrollment failed.');
      setLoading(false);
      return;
    }
    setLoading(false);
    setShowStudentModal(false);
    setStudentFullName(''); setStudentEmail(''); setStudentUsername(''); setStudentPassword(''); setStudentId('');
  };

  const handleToggleStatus = async (user: User) => {
    try {
      if (user.role === 'INSTRUCTOR') {
        await api.adminToggleStatus(user.id);
      }
    } catch {
      // Ignore backend error for local mock fallback
    }
    onToggleUserStatus(user.id);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPassword.trim()) return;

    try {
      await api.adminResetPassword(selectedUserForReset.id, newPassword.trim());
    } catch {
      // Local fallback
    }

    onResetPassword(selectedUserForReset.id, newPassword.trim());
    setResetSuccess(`Password for ${selectedUserForReset.fullName} has been updated.`);
    setNewPassword('');
    setTimeout(() => {
      setSelectedUserForReset(null);
      setResetSuccess('');
    }, 1200);
  };

  const openEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditStudentId(user.studentId || '');
    setEditAcademicLevel(user.academicLevel || 'CLASS_1');
    setEditInstructorCode(user.instructorCode || '');
    setEditSuccess('');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit || !editFullName.trim() || !editUsername.trim() || !editEmail.trim()) return;
    const updatedUser: User = {
      ...selectedUserForEdit,
      fullName: editFullName.trim(),
      username: editUsername.trim(),
      email: editEmail.trim().toLowerCase(),
      studentId: selectedUserForEdit.role === 'STUDENT' ? editStudentId.trim() : selectedUserForEdit.studentId,
      academicLevel: selectedUserForEdit.role === 'STUDENT' ? editAcademicLevel : selectedUserForEdit.academicLevel,
      instructorCode: selectedUserForEdit.role === 'INSTRUCTOR' ? editInstructorCode.trim() : selectedUserForEdit.instructorCode,
    };
    try {
      const savedUser = await api.adminUpdateUser(selectedUserForEdit.id, updatedUser);
      onUpdateUser(savedUser);
    } catch {
      onUpdateUser(updatedUser);
    }
    setEditSuccess('Account details updated. The new details are now active.');
    setTimeout(() => setSelectedUserForEdit(null), 1000);
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-linear-to-r from-emerald-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">
            <span>Institutional Governance Panel</span>
            <span>&bull;</span>
            <span>Super Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif">{adminUser.fullName}</h1>
          <p className="mt-1 text-sm text-slate-300">
            Oversee institutional accounts, provision teachers, audit course offerings, and maintain security.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Teacher</span>
        </button>
        <button onClick={() => setShowStudentModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow transition-colors">
          <UserPlus className="w-4 h-4" /><span>Enroll Student</span>
        </button>
      </div>

      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Enroll Student and Issue Credentials</h3>
            <form onSubmit={handleEnrollStudentSubmit} className="space-y-3">
              <input required value={studentFullName} onChange={(e) => setStudentFullName(e.target.value)} placeholder="Student full name" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
              <input required type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Student email" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
              <input required value={studentUsername} onChange={(e) => setStudentUsername(e.target.value)} placeholder="Login username" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
              <input required minLength={6} value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} placeholder="Temporary password" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
              {studentError && <p className="text-sm font-semibold text-rose-700">{studentError}</p>}
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID (optional)" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
              <select value={studentLevel} onChange={(e) => setStudentLevel(e.target.value as AcademicLevel)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">{ACADEMIC_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select>
              <p className="text-xs text-slate-500">Give the generated student ID or username and password to the enrolled student.</p>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowStudentModal(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-md">Enroll Student</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Teachers</p>
              <p className="text-2xl font-black text-slate-900">{instructors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Enrolled Students</p>
              <p className="text-2xl font-black text-slate-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Active Courses</p>
              <p className="text-2xl font-black text-slate-900">{courses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Assessments Taken</p>
              <p className="text-2xl font-black text-slate-900">{attempts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Provision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Provision Teacher Account</h3>
            <form onSubmit={handleAddInstructorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ustadh Hassan Warsame"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="hassan.warsame@shirejama.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Instructor Code</label>
                <input
                  type="text"
                  placeholder="e.g. INST-SOM-105 (optional)"
                  value={instCode}
                  onChange={(e) => setInstCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={tempPass}
                  onChange={(e) => setTempPass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-md shadow"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Reset Credentials: {selectedUserForReset.fullName}
            </h3>
            {resetSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-sm">
                {resetSuccess}
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForReset(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-md shadow"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Account Details</h3>
            {editSuccess ? <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-sm">{editSuccess}</div> : (
              <form onSubmit={handleEditUserSubmit} className="space-y-3">
                <input required value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                <input required value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                <input required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                {selectedUserForEdit.role === 'STUDENT' && <>
                  <input value={editStudentId} onChange={(e) => setEditStudentId(e.target.value)} placeholder="Student ID" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                  <select required value={editAcademicLevel} onChange={(e) => setEditAcademicLevel(e.target.value as User['academicLevel'])} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                    {['CLASS_1','CLASS_2','CLASS_3','CLASS_4','CLASS_5','CLASS_6','CLASS_7','CLASS_8','FORM_1','FORM_2','FORM_3','FORM_4'].map((level) => <option key={level} value={level}>{level.replace('_', ' ')}</option>)}
                  </select>
                </>}
                {selectedUserForEdit.role === 'INSTRUCTOR' && <input value={editInstructorCode} onChange={(e) => setEditInstructorCode(e.target.value)} placeholder="Instructor code" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />}
                <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setSelectedUserForEdit(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="px-4 py-2 bg-emerald-700 text-white font-bold text-sm rounded-md">Save Details</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Teacher roster */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-700" />
          <span>Institutional Teacher Roster</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {instructors.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{inst.fullName}</td>
                  <td className="py-3 px-4 text-xs font-mono">{inst.instructorCode}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{inst.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        inst.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inst.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditUser(inst)}
                      className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(inst)}
                      className={`text-xs font-bold px-2.5 py-1 rounded transition-colors ${
                        inst.isActive
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {inst.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => setSelectedUserForReset(inst)}
                      className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Reset Pass</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrolled Students Roster */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-700" />
          <span>Enrolled Adult Learners Roster</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Enrolled On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{std.fullName}</td>
                  <td className="py-3 px-4 text-xs font-mono">{std.studentId}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{std.email}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{std.dateJoined}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEditUser(std)} className="mr-2 text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"><Pencil className="w-3 h-3" /><span>Edit</span></button>
                    <button
                      onClick={() => setSelectedUserForReset(std)}
                      className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Reset Pass</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};