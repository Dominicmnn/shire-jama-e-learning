import { Course, QuizAttempt, User } from '../types';
import { Chapter } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    username: 'admin',
    fullName: 'Mohamed Ibrahim',
    email: 'admin@shirejama.edu',
    role: 'ADMIN',
    isActive: true,
    dateJoined: '2024-01-10',
  },
  {
    id: 'u-inst-1',
    username: 'alinur',
    fullName: 'Ustadh Ali Nur',
    email: 'ali.nur@shirejama.edu',
    role: 'INSTRUCTOR',
    isActive: true,
    dateJoined: '2024-02-01',
    instructorCode: 'INST-SOM-101',
  },
  {
    id: 'u-inst-2',
    username: 'megal',
    fullName: 'Dr. Deeqa Megag',
    email: 'deeqa.megag@shirejama.edu',
    role: 'INSTRUCTOR',
    isActive: true,
    dateJoined: '2024-02-15',
    instructorCode: 'INST-VOC-102',
  },
  {
    id: 'u-std-1',
    username: 'faiza',
    fullName: 'Faiza Hassan',
    email: 'faiza.hassan@example.com',
    role: 'STUDENT',
    isActive: true,
    dateJoined: '2024-03-01',
    studentId: 'STD-2024-089',
    academicLevel: 'CLASS_1',
  },
  {
    id: 'u-std-2',
    username: 'khalid',
    fullName: 'Khalid Warsame',
    email: 'khalid.w@example.com',
    role: 'STUDENT',
    isActive: true,
    dateJoined: '2024-03-04',
    studentId: 'STD-2024-094',
    academicLevel: 'FORM_1',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c-101',
    title: 'Somali Script & Functional Orthography (Shire Jama Method)',
    description:
      'Master the foundational Latin script adopted in 1972 under Shire Jama Ahmed. Learn phonetics, double vowels (aa, ee, ii, oo, uu), retroflex consonants (dh), and formal written composition.',
    instructorId: 'u-inst-1',
    instructorName: 'Ustadh Ali Nur',
    createdAt: '2024-02-05',
    updatedAt: '2024-03-01',
    materials: [
      {
        id: 'm-101',
        courseId: 'c-101',
        title: 'Shire Jama Alphabet & Pronunciation Reference Guide',
        type: 'PDF',
        fileName: 'shire_jama_orthography_guide.pdf',
        fileSize: '3.4 MB',
        fileUrl: '/sample-material.pdf',
        uploadDate: '2024-02-06',
        academicLevel: 'CLASS_1',
        description: 'Comprehensive 24-page primer illustrating consonant stops, gutturals (c, x), and vocalic harmonization.',
      },
      {
        id: 'm-102',
        courseId: 'c-101',
        title: 'Lecture 1: The Historical Codification & Vowel Lengthening',
        type: 'VIDEO',
        fileName: 'lecture_01_somali_vowels.mp4',
        fileSize: '148 MB',
        fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        uploadDate: '2024-02-08',
        academicLevel: 'CLASS_1',
        description: 'High-definition video lecture dissecting the phonemic differences between short and elongated vowels.',
      },
    ],
    quizzes: [
      {
        id: 'q-101',
        courseId: 'c-101',
        title: 'Somali Phonetics & Vowel Doubling Assessment',
        instructions: 'Read each prompt carefully and select the single best orthographic answer. Passing threshold is 70%.',
        passingScorePercent: 70,
        resultsVisibleToStudents: true,
        questions: [
          {
            id: 'q1-1',
            prompt: 'In the Shire Jama Latin alphabet, which letter represents the voiceless pharyngeal fricative (corresponding to Arabic ح)?',
            choices: [
              { id: 'c-1', text: 'Letter "x"', isCorrect: true },
              { id: 'c-2', text: 'Letter "c"', isCorrect: false },
              { id: 'c-3', text: 'Letter "kh"', isCorrect: false },
              { id: 'c-4', text: 'Letter "q"', isCorrect: false },
            ],
          },
          {
            id: 'q1-2',
            prompt: 'How does doubling a vowel (e.g., "aa" vs "a") alter the meaning of a Somali lexical unit?',
            choices: [
              { id: 'c-5', text: 'It creates a long vowel sound that frequently distinguishes completely different root words', isCorrect: true },
              { id: 'c-6', text: 'It indicates a silent consonant', isCorrect: false },
              { id: 'c-7', text: 'It is strictly decorative for poetic meter', isCorrect: false },
              { id: 'c-8', text: 'It only occurs at the end of borrowed English words', isCorrect: false },
            ],
          },
          {
            id: 'q1-3',
            prompt: 'Which consonant represents the voiced retroflex plosive in Somali orthography?',
            choices: [
              { id: 'c-9', text: 'dh', isCorrect: true },
              { id: 'c-10', text: 'sh', isCorrect: false },
              { id: 'c-11', text: 'kh', isCorrect: false },
              { id: 'c-12', text: 'th', isCorrect: false },
            ],
          },
        ],
      },
    ],
    chapters: [],
    academicLevels: ['CLASS_1'],
  },
  {
    id: 'c-102',
    title: 'Foundational Adult Numeracy & Commercial Arithmetic',
    description:
      'Practical mathematics designed for vocational market trade, small enterprise bookkeeping, metric inventory calculations, and business budgeting.',
    instructorId: 'u-inst-2',
    instructorName: 'Dr. Deeqa Megag',
    createdAt: '2024-02-18',
    updatedAt: '2024-02-28',
    materials: [
      {
        id: 'm-201',
        courseId: 'c-102',
        title: 'Commercial Bookkeeping & Ledger Template Primer',
        type: 'PDF',
        fileName: 'vocational_bookkeeping_primer.pdf',
        fileSize: '2.1 MB',
        fileUrl: '/sample-material.pdf',
        uploadDate: '2024-02-20',
        academicLevel: 'FORM_1',
        description: 'Step-by-step instructions on cashflow ledgers, reconciling expenses, and calculating gross profit.',
      },
      {
        id: 'm-202',
        courseId: 'c-102',
        title: 'Video Workshop: Reconciling Daily Receipts & Profit Margins',
        type: 'VIDEO',
        fileName: 'workshop_retail_math.mp4',
        fileSize: '190 MB',
        fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        uploadDate: '2024-02-22',
        academicLevel: 'FORM_1',
        description: 'Interactive demonstration of business profit-margin formulas and discount calculations.',
      },
    ],
    quizzes: [
      {
        id: 'q-201',
        courseId: 'c-102',
        title: 'Commercial Arithmetic Competency Check',
        instructions: 'Test your understanding of basic margins, invoice reconciliations, and percentage calculations.',
        passingScorePercent: 75,
        resultsVisibleToStudents: true,
        questions: [
          {
            id: 'q2-1',
            prompt: 'If wholesale cost is $80 and the selling price is $100, what is the profit margin percentage on the selling price?',
            choices: [
              { id: 'c-13', text: '20%', isCorrect: true },
              { id: 'c-14', text: '25%', isCorrect: false },
              { id: 'c-15', text: '15%', isCorrect: false },
              { id: 'c-16', text: '30%', isCorrect: false },
            ],
          },
          {
            id: 'q2-2',
            prompt: 'In a double-entry cash ledger, how are outgoing inventory expenditures recorded?',
            choices: [
              { id: 'c-17', text: 'As an expense debit in the procurement column', isCorrect: true },
              { id: 'c-18', text: 'As revenue', isCorrect: false },
              { id: 'c-19', text: 'Ignored until end of financial year', isCorrect: false },
              { id: 'c-20', text: 'As customer credit', isCorrect: false },
            ],
          },
        ],
      },
    ],
    chapters: [],
    academicLevels: ['FORM_1'],
  },
];

const withMockChapters = (courses: Course[]): Course[] => courses.map((course) => {
  const chapter: Chapter = {
    id: `${course.id}-ch-1`,
    courseId: course.id,
    title: 'Chapter 1',
    order: 1,
    materials: course.materials,
    quizzes: course.quizzes,
  };
  return { ...course, chapters: [chapter] };
});

export const INITIAL_COURSES_WITH_CHAPTERS = withMockChapters(INITIAL_COURSES);

export const INITIAL_QUIZ_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-1',
    quizId: 'q-101',
    quizTitle: 'Somali Phonetics & Vowel Doubling Assessment',
    courseTitle: 'Somali Script & Functional Orthography (Shire Jama Method)',
    studentId: 'u-std-1',
    studentName: 'Faiza Hassan',
    score: 3,
    totalQuestions: 3,
    percentage: 100,
    completedAt: '2024-03-02 14:35',
    answers: { 'q1-1': 'c-1', 'q1-2': 'c-5', 'q1-3': 'c-9' },
  },
];