import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, HelpCircle, Send, Sparkles, FileText, ShieldCheck } from 'lucide-react';

export const QuizPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Adaptive sequence state
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentDifficulty, setCurrentDifficulty] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const targetId = id || searchParams.get('session') || searchParams.get('quiz') || 'latest';

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quizAPI.getQuiz(targetId);
      if (res.success && res.data.quiz) {
        const initialQuiz = res.data.quiz;
        setQuiz(initialQuiz);
        setActiveQuestions(initialQuiz.questions || []);

        try {
          const adaptiveRes = await quizAPI.getNextQuestion(initialQuiz.id, []);
          if (adaptiveRes.success && adaptiveRes.data.nextQuestion) {
            setCurrentDifficulty(adaptiveRes.data.currentDifficulty || 'Medium');
          }
        } catch {
          // Fallback if endpoint fails
        }
      } else {
        throw new Error(res.message || 'Quiz data missing');
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz. Please generate a study session first.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [id, targetId]);

  const handleSelectOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleClearOption = (questionId) => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handleNextQuestion = async () => {
    if (!quiz || activeQuestions.length === 0) return;

    const updatedAnswersObj = { ...selectedAnswers };
    const answersArray = activeQuestions
      .filter((q, idx) => idx <= currentIndex && updatedAnswersObj[q.questionId] !== undefined)
      .map((q) => ({
        questionId: q.questionId,
        selectedOptionIndex: updatedAnswersObj[q.questionId],
        timeSpentSeconds: 10,
      }));

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setIsLoadingNext(true);
    try {
      const res = await quizAPI.getNextQuestion(quiz.id, answersArray);
      if (res.success && !res.data.isComplete && res.data.nextQuestion) {
        const nextQ = res.data.nextQuestion;
        if (!activeQuestions.some((q) => q.questionId === nextQ.questionId)) {
          setActiveQuestions((prev) => [...prev, nextQ]);
        }
        setCurrentDifficulty(res.data.currentDifficulty || nextQ.difficulty || 'Medium');
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.warn('Adaptive next question fallback:', err);
      if (currentIndex < activeQuestions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handleSubmitAttempt = async () => {
    if (!quiz || !quiz.questions) return;
    setIsSubmitting(true);
    try {
      const formattedAnswers = activeQuestions.map((q) => ({
        questionId: q.questionId,
        selectedOptionIndex: selectedAnswers[q.questionId] ?? -1,
        timeSpentSeconds: 10,
      }));

      const res = await quizAPI.submitAttempt(quiz.id, formattedAnswers, 60);
      if (res.success && res.data.attempt) {
        navigate(`/results/${res.data.attempt.id}`, {
          state: { attempt: res.data.attempt, quiz },
        });
      } else {
        throw new Error(res.message || 'Evaluation failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to evaluate quiz submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSourceBadge = (source) => {
    if (!source || (!source.document && !source.page)) return null;

    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-surface-600 bg-surface-100/80 px-2 py-0.5 rounded-md border border-surface-200 font-medium">
        <FileText className="w-3 h-3 text-surface-400" />
        <span>
          Source: <strong className="font-semibold text-surface-700">{source.document || 'Study Material'}</strong>
          {source.page ? ` · Page ${source.page}` : ''}
          {source.section ? ` · ${source.section}` : ''}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="text-center">
          <CardContent className="space-y-4 py-8">
            <Alert variant="danger" title="Quiz Unavailable">
              {error}
            </Alert>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" icon={RotateCcw} onClick={loadQuiz}>
                Retry
              </Button>
              <Link to="/upload">
                <Button icon={ArrowRight}>Upload PDF Material</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || !activeQuestions || activeQuestions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-full inline-block">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">No Questions Available</h2>
        <p className="text-sm text-surface-500">
          Upload a study material PDF to generate practice quizzes automatically.
        </p>
        <Link to="/upload">
          <Button icon={ArrowRight}>Upload Material PDF</Button>
        </Link>
      </div>
    );
  }

  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestionCount = quiz.questions ? Math.max(quiz.questions.length, activeQuestions.length) : activeQuestions.length;
  const isLastQuestion = currentIndex === totalQuestionCount - 1;
  const currentSelected = selectedAnswers[currentQuestion?.questionId];

  const qDifficulty = currentQuestion?.difficulty || currentDifficulty || 'Medium';

  const getDifficultyBadge = (diff) => {
    const normalized = diff ? diff.toLowerCase() : 'medium';
    if (normalized === 'easy') {
      return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Difficulty: Easy</Badge>;
    } else if (normalized === 'hard') {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Difficulty: Hard</Badge>;
    }
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Difficulty: Medium</Badge>;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Top Header & Progress Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="brand">
            Question {currentIndex + 1} of {totalQuestionCount}
          </Badge>
          {getDifficultyBadge(qDifficulty)}
          <span className="text-xs font-semibold text-surface-500">
            Topic: {currentQuestion.topicTag}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeQuestions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.questionId] !== undefined;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.questionId || idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Question ${idx + 1}`}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isCurrent
                    ? 'bg-brand-600 text-white ring-2 ring-brand-300 shadow-2xs'
                    : isAnswered
                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-brand-600 font-bold uppercase tracking-wider">
                {quiz.title}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Grounded Question
              </span>
            </div>
            <CardTitle className="text-lg font-bold text-surface-900 leading-snug">
              {currentQuestion.text}
            </CardTitle>
            {renderSourceBadge(currentQuestion.source)}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = currentSelected === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(currentQuestion.questionId, idx)}
                className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/70 text-brand-950 shadow-xs ring-1 ring-brand-500'
                    : 'border-surface-200 hover:border-surface-300 bg-white text-surface-800 hover:bg-surface-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                        : 'border-surface-300 text-surface-600 bg-surface-50'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </CardContent>

        <CardFooter className="flex justify-between items-center pt-4 border-t border-surface-100">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            icon={ArrowLeft}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentSelected !== undefined && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClearOption(currentQuestion.questionId)}
              >
                Clear Selection
              </Button>
            )}

            {!isLastQuestion ? (
              <Button
                size="md"
                loading={isLoadingNext}
                onClick={handleNextQuestion}
                icon={ArrowRight}
              >
                Next Question
              </Button>
            ) : (
              <Button
                size="md"
                variant="primary"
                loading={isSubmitting}
                onClick={handleSubmitAttempt}
                icon={Send}
              >
                Submit & View Results
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
