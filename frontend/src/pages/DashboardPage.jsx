import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Upload,
  BookOpen,
  Clock,
  FileText,
  ChevronRight,
  Trophy,
  HelpCircle,
  RotateCcw,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Target,
} from 'lucide-react';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || 'Failed to retrieve dashboard overview');
      }
    } catch (err) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 py-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="text-center">
          <CardContent className="space-y-4 py-8">
            <Alert variant="danger" title="Dashboard Error">
              {error}
            </Alert>
            <Button variant="outline" icon={RotateCcw} onClick={loadDashboard}>
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const topicWisePerformance = data?.topicWisePerformance || [];
  const bestPerformingTopics = data?.bestPerformingTopics || [];
  const weakestTopics = data?.weakestTopics || [];
  const recommendedRevision = data?.recommendedRevision || [];
  const recentMaterials = data?.recentMaterials || [];
  const recentAttempts = data?.recentAttempts || [];

  const isEmptyState = (metrics.materialsCount || 0) === 0 && (metrics.attemptsCount || 0) === 0;

  return (
    <div className="space-y-8 py-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-surface-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Student Workspace & Analytics</h1>
          <p className="text-sm text-surface-500 mt-1">
            Real progress insights derived directly from study material sessions and practice quizzes.
          </p>
        </div>
        <Link to="/upload" className="flex-shrink-0">
          <Button icon={Upload} size="lg" className="w-full sm:w-auto shadow-xs">
            Upload New PDF
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {isEmptyState ? (
        <Card className="p-8 sm:p-12 text-center bg-white border border-surface-200 shadow-xs">
          <div className="mx-auto w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100/60 mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-surface-900">Welcome to Preply</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto mt-2 leading-relaxed">
            No study materials or quiz attempts recorded yet. Upload a PDF document to generate an interactive study kit, practice quizzes, and track your actual performance analytics.
          </p>
          <div className="mt-6">
            <Link to="/upload">
              <Button icon={Upload} size="lg" className="shadow-xs">
                Upload First PDF Document
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Metrics Counter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 sm:p-5 bg-white flex items-center gap-3.5">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-xl border border-brand-100/60">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-surface-900 leading-none block">
                  {metrics.materialsCount || 0}
                </span>
                <p className="text-xs text-surface-500 font-medium mt-1">Materials</p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 bg-white flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/60">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-surface-900 leading-none block">
                  {metrics.sessionsCount || 0}
                </span>
                <p className="text-xs text-surface-500 font-medium mt-1">Study Kits</p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 bg-white flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/60">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-surface-900 leading-none block">
                  {metrics.attemptsCount || 0}
                </span>
                <p className="text-xs text-surface-500 font-medium mt-1">Quizzes Taken</p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 bg-white flex items-center gap-3.5">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/60">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-surface-900 leading-none block">
                  {metrics.totalQuestionsAnswered || 0}
                </span>
                <p className="text-xs text-surface-500 font-medium mt-1">Questions Answered</p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 bg-white flex items-center gap-3.5 col-span-2 md:col-span-1">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/60">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-brand-600 leading-none block">
                  {metrics.averageScorePercentage || 0}%
                </span>
                <p className="text-xs text-surface-500 font-medium mt-1">Average Score</p>
              </div>
            </Card>
          </div>

          {/* Performance Visualization & Revision Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Topic Performance Visualization */}
            <Card className="p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-surface-100">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-brand-600" />
                    <h2 className="text-base font-bold text-surface-900">Topic Performance Breakdown</h2>
                  </div>
                  <span className="text-xs text-surface-400 font-medium">Actual Quiz Data</span>
                </div>

                {topicWisePerformance.length === 0 ? (
                  <p className="text-xs text-surface-500 py-6 text-center">
                    No topic performance data available yet. Complete a quiz to view topic breakdowns.
                  </p>
                ) : (
                  <div className="space-y-4 pt-4">
                    {topicWisePerformance.map((topic) => {
                      const isStrong = topic.accuracyPercentage >= 70;
                      const isWeak = topic.accuracyPercentage < 60;
                      const barColor = isStrong
                        ? 'bg-emerald-500'
                        : isWeak
                        ? 'bg-amber-500'
                        : 'bg-brand-500';

                      return (
                        <div key={topic.topicTag} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-surface-800 line-clamp-1">{topic.topicTag}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-surface-500 font-medium">
                                {topic.correctAnswers}/{topic.totalQuestions} correct
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  isStrong
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : isWeak
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                    : 'bg-brand-50 text-brand-700 border border-brand-200/60'
                                }`}
                              >
                                {topic.accuracyPercentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                              style={{ width: `${Math.max(topic.accuracyPercentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {bestPerformingTopics.length > 0 && (
                <div className="mt-6 pt-4 border-t border-surface-100 flex items-center gap-2 text-xs text-surface-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Strong Topics: <strong className="font-semibold text-surface-800">{bestPerformingTopics.map(t => t.topicTag).join(', ')}</strong>
                  </span>
                </div>
              )}
            </Card>

            {/* Recommended Revision Card */}
            <Card className="p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-surface-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-bold text-surface-900">Recommended Revision</h2>
                  </div>
                  <Badge variant="warning" className="text-[11px] font-semibold">
                    {recommendedRevision.length} Focus Areas
                  </Badge>
                </div>

                {recommendedRevision.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-surface-800">No Weak Topics Flagged</p>
                    <p className="text-xs text-surface-500 max-w-xs mx-auto">
                      Great job! Your recent quiz attempts demonstrate high accuracy across all evaluated topics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-4">
                    {recommendedRevision.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 flex items-center justify-between gap-3"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-surface-900">{item.topic}</h4>
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            Grounded in: <span className="font-semibold text-surface-700">{item.materialTitle || 'Study Material'}</span>
                          </p>
                        </div>
                        {item.materialId ? (
                          <Link to={`/study/${item.materialId}`}>
                            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1 bg-white shadow-2xs hover:bg-amber-50">
                              Review Topic <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Review Topic
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-surface-400 mt-6 pt-3 border-t border-surface-100">
                Action items direct you back to exact source concepts in your study guide.
              </p>
            </Card>
          </div>

          {/* Recent Study Sessions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900">Active Study Sessions</h2>
              <span className="text-xs text-surface-500 font-medium">Recent document kits</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {recentMaterials.map((mat) => (
                <Card key={mat.id} className="hover:border-brand-300 hover:shadow-sm transition-all flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl border border-brand-100/80">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold line-clamp-1">{mat.title}</CardTitle>
                        <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Clock className="w-3.5 h-3.5" /> {new Date(mat.createdAt).toLocaleDateString()} • {mat.originalFileName}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mat.processingStatus === 'completed' ? 'success' : 'warning'} className="font-semibold">
                      {mat.processingStatus === 'completed' ? 'Analyzed' : mat.processingStatus}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <p className="text-xs text-surface-600 leading-relaxed">
                      Source Document: <span className="font-medium text-surface-800">{mat.originalFileName}</span> ({Math.round((mat.fileSize || 0) / 1024)} KB)
                    </p>
                    <div className="flex gap-2.5 pt-1">
                      <Link to={`/study/${mat.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full font-semibold" icon={BookOpen}>
                          Study Guide
                        </Button>
                      </Link>
                      <Link to={`/quiz/${mat.id}`} className="flex-1">
                        <Button size="sm" className="w-full font-semibold" icon={ChevronRight}>
                          Take Quiz
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Upload New Material Card */}
              <Card className="border-dashed border-2 border-surface-300 bg-surface-50/50 hover:bg-surface-100/40 hover:border-surface-400 flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[200px] transition-all">
                <div className="p-3.5 bg-white rounded-full border border-surface-200 text-surface-500 shadow-2xs">
                  <Upload className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-800">Upload New Material</h3>
                  <p className="text-xs text-surface-500 mt-1 max-w-xs">
                    Upload a PDF document to generate an executive study kit and practice quiz.
                  </p>
                </div>
                <Link to="/upload">
                  <Button variant="outline" size="sm" className="font-semibold">
                    Choose PDF File
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
