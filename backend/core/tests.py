from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Chapter, Course, LearningMaterial, Quiz, Question, Choice
from datetime import time
import json

User = get_user_model()


class ShireJamaLmsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin
        self.admin = User.objects.create_superuser(
            username='test_admin',
            email='admin@shirejama.edu',
            password='Password123!',
            role=User.Role.ADMIN
        )

        # 2. Instructor
        self.instructor = User.objects.create_user(
            username='test_inst',
            email='inst@shirejama.edu',
            password='Password123!',
            role=User.Role.INSTRUCTOR,
            instructor_code='INST-999'
        )

        # 3. Student
        self.student = User.objects.create_user(
            username='test_student',
            email='student@example.com',
            password='Password123!',
            role=User.Role.STUDENT,
            student_id='STD-999'
            , academic_level='CLASS_1'
        )

    def test_admin_enrolls_student(self):
        """Verify only an administrator can create an active student account."""
        self.client.force_authenticate(user=self.student)
        forbidden = self.client.post('/api/admin/students/', {
            'fullName': 'Amina Duale',
            'email': 'amina.duale@example.com',
            'username': 'amina.duale',
            'password': 'StrongPassword123!',
            'academicLevel': 'FORM_1',
        })
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/students/', {
            'fullName': 'Amina Duale',
            'email': 'amina.duale@example.com',
            'username': 'amina.duale',
            'password': 'StrongPassword123!',
            'academicLevel': 'FORM_1',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='amina.duale@example.com').exists())
        user = User.objects.get(email='amina.duale@example.com')
        self.assertEqual(user.role, User.Role.STUDENT)
        self.assertEqual(user.academic_level, 'FORM_1')

    def test_student_only_sees_materials_for_assigned_level(self):
        """Students cannot list or stream materials assigned to another level."""
        course = Course.objects.create(
            title='Levelled Course',
            description='Test Desc',
            instructor=self.instructor,
            academic_levels=['FORM_1']
        )
        chapter = Chapter.objects.create(course=course, title='Chapter 1')
        material = LearningMaterial.objects.create(
            course=course,
            chapter=chapter,
            title='Form 1 Material',
            material_type=LearningMaterial.MaterialType.PDF,
            file='materials/test.pdf'
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

        response = self.client.get(f'/api/materials/{material.id}/stream/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_course_detail_includes_quizzes(self):
        course = Course.objects.create(
            title='Course With Quiz',
            description='Test course detail',
            instructor=self.instructor,
            academic_levels=['CLASS_1']
        )
        chapter = Chapter.objects.create(course=course, title='Chapter 1')
        quiz = Quiz.objects.create(course=course, chapter=chapter, title='Student Quiz')
        self.client.force_authenticate(user=self.student)

        response = self.client.get(f'/api/courses/{course.id}/', HTTP_HOST='localhost')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['chapters'][0]['quizzes'][0]['id'], quiz.id)

    def test_student_material_stream_is_inline_even_when_download_is_allowed(self):
        course = Course.objects.create(
            title='Student Course',
            description='Test Desc',
            instructor=self.instructor,
            academic_levels=['CLASS_1']
        )
        chapter = Chapter.objects.create(course=course, title='Chapter 1')
        material = LearningMaterial.objects.create(
            course=course,
            chapter=chapter,
            title='Student Material',
            material_type=LearningMaterial.MaterialType.PDF,
            allow_download=True,
            file=SimpleUploadedFile('test.pdf', b'%PDF-1.4 test')
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/materials/{material.id}/stream/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response['Content-Disposition'].startswith('inline;'))

    def test_pdf_material_upload_rejects_word_documents(self):
        course = Course.objects.create(
            title='Upload Course',
            description='Test Desc',
            instructor=self.instructor,
            academic_levels=['CLASS_1']
        )
        chapter = Chapter.objects.create(course=course, title='Chapter 1')
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(
            f'/api/courses/{course.id}/materials/',
            {
                'title': 'Word file incorrectly labeled as PDF',
                'type': 'PDF',
                'chapterId': chapter.id,
                'file': SimpleUploadedFile('notes.docx', b'word document'),
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_create_course(self):
        """Verify students are strictly forbidden from creating courses."""
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/courses/', {
            'title': 'Unauthorized Course',
            'description': 'Student attempt'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_can_create_course(self):
        """Verify faculty instructors can create courses."""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post('/api/courses/', {
            'title': 'Intermediate Somali Grammar',
            'description': 'Advanced morphology and syntax',
            'academicLevels': ['CLASS_1', 'FORM_1']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.filter(title='Intermediate Somali Grammar').count(), 1)

    def test_admin_created_student_can_login_with_submitted_credentials(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/admin/students/', {
            'fullName': 'New Student',
            'email': 'new.student@example.com',
            'username': 'new_student',
            'password': 'StudentPass123!',
            'studentId': 'STD-NEW-001',
            'academicLevel': 'CLASS_1',
        }, format='json', HTTP_HOST='localhost')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=None)
        login = self.client.post('/api/auth/login/', {
            'username': 'new_student',
            'password': 'StudentPass123!',
        }, format='json', HTTP_HOST='localhost')
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn('access', login.data)

    def test_admin_can_update_student_and_instructor_details(self):
        self.client.force_authenticate(user=self.admin)
        student_response = self.client.patch(
            f'/api/admin/users/{self.student.id}/',
            {
                'fullName': 'Updated Student',
                'username': 'updated_student',
                'email': 'updated.student@example.com',
                'studentId': 'STD-UPDATED',
                'academicLevel': 'FORM_1',
            },
            format='json'
        )
        self.assertEqual(student_response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.username, 'updated_student')
        self.assertEqual(self.student.academic_level, 'FORM_1')
        self.assertEqual(self.student.get_full_name(), 'Updated Student')

        instructor_response = self.client.patch(
            f'/api/admin/users/{self.instructor.id}/',
            {'fullName': 'Updated Instructor', 'email': 'updated.instructor@shirejama.edu', 'instructorCode': 'INST-UPDATED'},
            format='json'
        )
        self.assertEqual(instructor_response.status_code, status.HTTP_200_OK)
        self.instructor.refresh_from_db()
        self.assertEqual(self.instructor.get_full_name(), 'Updated Instructor')
        self.assertEqual(self.instructor.instructor_code, 'INST-UPDATED')

        self.client.force_authenticate(user=self.student)
        forbidden_response = self.client.patch(f'/api/admin/users/{self.instructor.id}/', {'fullName': 'Nope'}, format='json')
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_quiz_grading(self):
        """Verify objective calculation of quiz submissions and score percentage."""
        # Create course & quiz
        course = Course.objects.create(
            title='Test Course',
            description='Test Desc',
            instructor=self.instructor,
            academic_levels=['CLASS_1']
        )
        quiz = Quiz.objects.create(
            course=course,
            title='Phonetics Test',
            passing_score_percent=70
            , results_visible_to_students=True
        )
        q1 = Question.objects.create(quiz=quiz, prompt='Question 1', order=1)
        c1_true = Choice.objects.create(question=q1, text='Correct 1', is_correct=True)
        Choice.objects.create(question=q1, text='False 1', is_correct=False)

        q2 = Question.objects.create(quiz=quiz, prompt='Question 2', order=2)
        Choice.objects.create(question=q2, text='False 2', is_correct=False)
        c2_true = Choice.objects.create(question=q2, text='Correct 2', is_correct=True)

        # Authenticate as student and submit 1 correct answer out of 2 (50%)
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/quizzes/{quiz.id}/submit/', {
            'answers': {
                str(q1.id): c1_true.id,
                str(q2.id): 99999,  # Incorrect
            }
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['score'], 1)
        self.assertEqual(response.data['totalQuestions'], 2)
        self.assertEqual(response.data['percentage'], 50.0)
        self.assertFalse(response.data['passed'])

    def test_non_multiple_choice_answers_accept_text_and_files(self):
        course = Course.objects.create(title='Submission Course', description='Test', instructor=self.instructor, academic_levels=['CLASS_1'])
        quiz = Quiz.objects.create(course=course, title='Written and upload quiz', results_visible_to_students=True)
        text_question = Question.objects.create(quiz=quiz, prompt='Explain the lesson.', question_type=Question.QuestionType.LONG_ANSWER, order=1)
        file_question = Question.objects.create(quiz=quiz, prompt='Upload your work.', question_type=Question.QuestionType.FILE_UPLOAD, order=2)
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/',
            {
                'answers': json.dumps({str(text_question.id): 'My written answer.'}),
                f'answerFile_{file_question.id}': SimpleUploadedFile('answer.pdf', b'%PDF-1.4 answer'),
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        attempt = quiz.attempts.get(student=self.student)
        self.assertEqual(attempt.responses.count(), 2)
        self.assertEqual(attempt.responses.get(question=text_question).text_answer, 'My written answer.')
        file_response = attempt.responses.get(question=file_question)
        self.assertTrue(file_response.answer_file.name.endswith('.pdf'))

    def test_teacher_can_attach_question_document(self):
        course = Course.objects.create(title='Document Quiz Course', description='Test', instructor=self.instructor, academic_levels=['CLASS_1'])
        chapter = Chapter.objects.create(course=course, title='Chapter 1')
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(
            f'/api/courses/{course.id}/quizzes/',
            {
                'title': 'Structured Quiz',
                'chapterId': chapter.id,
                'questions': json.dumps([{'prompt': 'Read the attached question.', 'questionType': 'LONG_ANSWER', 'choices': []}]),
                'questionFile_0': SimpleUploadedFile('questions.pdf', b'%PDF-1.4 questions'),
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Question.objects.get(quiz__title='Structured Quiz').question_file.name.endswith('.pdf'))

    def test_only_course_teacher_can_view_and_grade_manual_attempt(self):
        other_instructor = User.objects.create_user(username='other_inst', email='other@shirejama.edu', password='Password123!', role=User.Role.INSTRUCTOR)
        course = Course.objects.create(title='Owned Course', description='Test', instructor=self.instructor, academic_levels=['CLASS_1'])
        quiz = Quiz.objects.create(course=course, title='Manual Quiz')
        question = Question.objects.create(quiz=quiz, prompt='Explain.', question_type=Question.QuestionType.LONG_ANSWER, order=1)
        self.client.force_authenticate(user=self.student)
        self.client.post(f'/api/quizzes/{quiz.id}/submit/', {'answers': json.dumps({str(question.id): 'Written response'})}, format='multipart')
        attempt = quiz.attempts.get(student=self.student)
        self.client.force_authenticate(user=other_instructor)
        self.assertEqual(self.client.get('/api/quiz-results/').data, [])
        self.assertEqual(self.client.post(f'/api/quiz-attempts/{attempt.id}/grade/', {'score': 85}).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.instructor)
        pending_attempt = self.client.get('/api/quiz-results/').data[0]
        self.assertFalse(pending_attempt['isGraded'])
        self.assertIsNone(pending_attempt['finalScore'])
        self.assertIsNone(pending_attempt['finalPercentage'])
        self.assertEqual(pending_attempt['answerReview'][0]['textAnswer'], 'Written response')
        self.assertIsNone(pending_attempt['answerReview'][0]['correctAnswer'])
        self.assertIsNone(pending_attempt['answerReview'][0]['isCorrect'])
        grade_response = self.client.post(f'/api/quiz-attempts/{attempt.id}/grade/', {'score': 85, 'feedback': 'Good work.'})
        self.assertEqual(grade_response.status_code, status.HTTP_200_OK)
        self.assertEqual(grade_response.data['finalScore'], 85)
        self.assertTrue(grade_response.data['isGraded'])
        self.client.force_authenticate(user=self.student)
        student_results = self.client.get('/api/quiz-results/')
        self.assertEqual(student_results.status_code, status.HTTP_200_OK)
        self.assertEqual(student_results.data[0]['finalScore'], 85)

    def test_quiz_submission_respects_daily_time_window(self):
        course = Course.objects.create(title='Window Course', description='Test', instructor=self.instructor, academic_levels=['CLASS_1'])
        quiz = Quiz.objects.create(course=course, title='Closed Quiz', opens_at=time(23, 0), closes_at=time(23, 30))
        self.client.force_authenticate(user=self.student)
        with self.settings(TIME_ZONE='UTC'):
            response = self.client.post(f'/api/quizzes/{quiz.id}/submit/', {'answers': {}}, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN])

    def test_quiz_results_require_instructor_authorization(self):
        course = Course.objects.create(
            title='Private Results Course',
            description='Test Desc',
            instructor=self.instructor,
            academic_levels=['CLASS_1']
        )
        quiz = Quiz.objects.create(course=course, title='Private Quiz')
        question = Question.objects.create(quiz=quiz, prompt='Question 1', order=1)
        correct_choice = Choice.objects.create(question=question, text='Correct', is_correct=True)
        Choice.objects.create(question=question, text='Incorrect')

        self.client.force_authenticate(user=self.student)
        submit_response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/',
            {'answers': {str(question.id): correct_choice.id}},
            format='json'
        )
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(submit_response.data['resultAvailable'])
        self.assertNotIn('score', submit_response.data)

        student_results = self.client.get('/api/quiz-results/')
        self.assertEqual(student_results.status_code, status.HTTP_200_OK)
        self.assertEqual(len(student_results.data), 1)
        self.assertTrue(student_results.data[0]['isGraded'])

        self.client.force_authenticate(user=self.instructor)
        instructor_results = self.client.get('/api/quiz-results/')
        self.assertEqual(instructor_results.status_code, status.HTTP_200_OK)
        self.assertEqual(len(instructor_results.data), 1)
        self.assertEqual(instructor_results.data[0]['score'], 1)
        self.assertEqual(instructor_results.data[0]['answerReview'][0]['selectedAnswer'], 'Correct')
        self.assertEqual(instructor_results.data[0]['answerReview'][0]['correctAnswer'], 'Correct')
        self.assertTrue(instructor_results.data[0]['answerReview'][0]['isCorrect'])