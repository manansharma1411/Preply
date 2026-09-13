import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { Trophy, AlertTriangle, BookOpen, RotateCcw, CheckCircle2, ShieldCheck, BarChart3, FileText, Check, X } from 'lucide-react';

export const ResultsPage = () => {
  const { attemptId } = useParams();
  const location = useLocation();

  const [attempt, setAttempt] = useState(location.state?.attempt || null);
  const [loading, setLoading] = useState(!location.state?.attempt);
  const [error, setError] = useState(null);

  const targetAttemptId = attemptId || 'latest';

  const loadAttempt = async () => {
    if (location.state?.attempt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizAPI.getAttempt(targetAttemptId);
      if (res.success && res.data.attempt) {
        setAttempt(res.data.attempt);
      } else {
        throw new Error(res.message || 'Quiz attempt result not found');
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve quiz evaluation results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  const renderSourceBadge = (source) => {
    if (!source || (!source.document && !source.page)) return null;

    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-surface-600 bg-surface-100 px-2 py-0.5 rounded border border-surface-200 font-medium">
        <FileText className="w-3 h-3 text-surface-400" />
        Source: {source.document || 'Study Material'}
        {source.page ? ` · Page ${source.page}` : ''}
        {source.section ? ` · ${source.section}` : ''}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Card className="text-center p-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="text-center">
          <CardContent className="space-y-4 py-8">
            <Alert variant="danger" title="Result Unavailable">
              {error || 'No recent quiz attempt evaluation found.'}
            </Alert>
            <div className="flex gap-3 justify-center">
              <Link to="/study">
                <Button variant="outline" icon={BookOpen}>
                  Study Materials
                </Button>
              </Link>
              <Link to="/quiz">
                <Button icon={RotateCcw}>Take Quiz</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scorePercentage = attempt.percentage ?? 0;
  const correctCount = attempt.score ?? 0;
  const totalQuestions = attempt.answers?.length || 0;
  const weakTopics = attempt.weakTopics || [];
  const strongTopics = attempt.strongTopics || [];
  const topicBreakdown = attempt.topicWisePerformance || [];
  const difficultyBreakdown = attempt.difficultyWisePerformance || [];
  const recommendations = attempt.recommendedRevisionAreas || [];
  const quizQuestions = attempt.quizId?.questions || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header Result Card */}
      <Card className="text-center p-8 sm:p-10 bg-gradient-to-b from-white to-surface-50/80 shadow-xs border-surface-200">
        <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-full mb-4 shadow-2xs border border-amber-100">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-surface-900">Quiz Evaluation Complete</h1>
        <p className="text-sm text-surface-500 mt-1 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Fact-Grounded Performance & Topic Breakdown
        </p>

        <div className="mt-6 inline-flex items-center gap-6 sm:gap-8 p-5 bg-white border border-surface-200 rounded-2xl shadow-xs">
          <div className="text-center">
            <span className="text-3xl sm:text-4xl font-black text-brand-600 leading-none block">{scorePercentage}%</span>
            <p className="text-xs text-surface-500 font-semibold mt-1">Overall Score</p>
          </div>
          <div className="w-px h-10 bg-surface-200" />
          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-surface-800 leading-none block">
              {correctCount} / {totalQuestions}
            </span>
            <p className="text-xs text-surface-500 font-semibold mt-1">Correct Answers</p>
          </div>
        </div>
      </Card>

      {/* Strong & Weak Topic Summary Alerts */}
      {weakTopics.length > 0 ? (
        <Alert variant="warning" title="Weak Topics Identified">
          Accuracy gaps detected in: <strong className="font-semibold">{weakTopics.join(', ')}</strong>. Review the grounded revision recommendations below.
        </Alert>
      ) : (
        <Alert variant="success" title="Great Mastery Demonstrated!">
          Excellent performance! You answered all topics above the target 70% threshold.
        </Alert>
      )}

      {/* Strong Topics Mastered Section */}
      {strongTopics.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-emerald-900 text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Strong Topics Mastered (≥70% Accuracy)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pb-4">
            {strongTopics.map((topic, idx) => (
              <Badge key={idx} className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold px-3 py-1">
                ✓ {topic}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Difficulty Breakdown Grid */}
      {difficultyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-surface-900">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              Difficulty-Wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {difficultyBreakdown.map((item, idx) => {
                const isEasy = item.difficulty === 'Easy';
                const isHard = item.difficulty === 'Hard';
                const colorClass = isEasy ? 'text-sky-600' : isHard ? 'text-rose-600' : 'text-amber-600';
                const bgProgressClass = isEasy ? 'bg-sky-500' : isHard ? 'bg-rose-500' : 'bg-amber-500';

                return (
                  <div key={idx} className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-surface-800">{item.difficulty}</span>
                      <span className={colorClass}>
                        {item.correctAnswers} / {item.totalQuestions} ({item.accuracyPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${bgProgressClass}`}
                        style={{ width: `${item.accuracyPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grounded Question-by-Question Review with Explanations */}
      {attempt.answers && attempt.answers.length > 0 && quizQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-surface-900 flex items-center justify-between">
              <span>Detailed Question Explanations & Source References</span>
              <Badge variant="outline">Grounded Review</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.answers.map((ans, idx) => {
              const q = quizQuestions.find((item) => item.questionId === ans.questionId) || quizQuestions[idx];
              if (!q) return null;

              return (
                <div key={idx} className={`p-4 rounded-xl border space-y-2 text-xs ${
                  ans.isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-surface-900 leading-snug">
                      {idx + 1}. {q.text}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                      ans.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ans.isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {/* Explanation & Source Grounding */}
                  <div className="pt-2 border-t border-surface-200/60 space-y-1.5">
                    <p className="text-surface-700 font-medium">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                    {renderSourceBadge(q.source)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommended Revision Strategy Card */}
      <Card className="border-brand-200 bg-brand-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-950 text-base font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Recommended Grounded Revision Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-surface-700 leading-relaxed">
          {recommendations.length > 0 ? (
            <div className="space-y-2.5">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-surface-900 font-medium">{rec}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-3.5 bg-white border border-emerald-200 rounded-xl text-surface-800 font-medium">
              Your performance across all topics is solid! Maintain readiness by performing periodic spaced-repetition quiz reviews.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to={attempt.materialId ? `/study/${attempt.materialId}` : '/study'} className="flex-1">
              <Button size="md" className="w-full font-semibold" icon={BookOpen}>
                Review Study Notes
              </Button>
            </Link>
            <Link to={attempt.quizId ? `/quiz/${attempt.quizId}` : '/quiz'} className="flex-1">
              <Button variant="outline" size="md" className="w-full font-semibold" icon={RotateCcw}>
                Re-take Quiz
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
