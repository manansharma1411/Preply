import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Skeleton';
import { ConceptMap } from '../components/conceptMap/ConceptMap';
import { ExplainModal } from '../components/study/ExplainModal';
import {
  BookOpen,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Search,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  Target,
  Clock,
  Gauge,
  Network,
} from 'lucide-react';

export const StudyPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTerm, setCopiedTerm] = useState(null);

  // Explain Differently Modal State
  const [explainModalState, setExplainModalState] = useState({
    isOpen: false,
    concept: '',
    existingExplanation: '',
  });

  const openExplainModal = (concept, existingExplanation = '') => {
    setExplainModalState({
      isOpen: true,
      concept,
      existingExplanation,
    });
  };

  const closeExplainModal = () => {
    setExplainModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const loadStudySession = async () => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        const res = await sessionsAPI.getSession(id);
        if (res.success && res.data.session) {
          setSession(res.data.session);
        }
      } else {
        const listRes = await sessionsAPI.getSessions(1, 1);
        if (listRes.success && listRes.data.sessions && listRes.data.sessions.length > 0) {
          const firstSessionId = listRes.data.sessions[0].id;
          const detailRes = await sessionsAPI.getSession(firstSessionId);
          setSession(detailRes.data.session);
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load study session content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudySession();
  }, [id]);

  const handleCopyText = (text, termKey) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTerm(termKey);
      setTimeout(() => setCopiedTerm(null), 2000);
    }
  };

  const renderSourceBadge = (source) => {
    const docName = source?.document || session?.materialId?.originalFileName;
    if (!source && !docName) return null;

    const page = source?.page;
    const section = source?.section;

    return (
      <div className="flex items-center gap-1.5 text-[11px] text-surface-500 bg-surface-100/70 px-2 py-0.5 rounded-md border border-surface-200 font-medium">
        <FileText className="w-3 h-3 text-surface-400" />
        <span>
          Source: <strong className="font-semibold text-surface-700">{docName || 'Document'}</strong>
          {page ? ` · Page ${page}` : ''}
          {section ? ` · ${section}` : ''}
        </span>
      </div>
    );
  };

  const filteredTopics = (session?.keyTopics || []).filter(
    (t) =>
      t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConcepts = (session?.importantConcepts || []).filter(
    (c) =>
      c.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.explanation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDefinitions = (session?.definitions || []).filter(
    (d) =>
      d.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <div className="space-y-3 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
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
            <Alert variant="danger" title="Unable to Load Session">
              {error}
            </Alert>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" icon={RotateCcw} onClick={loadStudySession}>
                Retry Loading
              </Button>
              <Link to="/upload">
                <Button>Upload PDF</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-brand-50 text-brand-600 rounded-full inline-block">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">No Study Sessions Found</h2>
        <p className="text-sm text-surface-500">
          Upload a study material PDF to generate your first structured study session.
        </p>
        <Link to="/upload">
          <Button icon={ArrowRight}>Upload PDF Material</Button>
        </Link>
      </div>
    );
  }

  const prefs = session.preferences || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Header Bar with Personalization Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand">Exam Study Kit</Badge>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Grounded Material
            </span>
            {prefs.studyGoal && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                <Target className="w-3 h-3 text-brand-600" /> Goal: {prefs.studyGoal}
              </span>
            )}
            {prefs.studyTime && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" /> Time: {prefs.studyTime}
              </span>
            )}
            {prefs.targetDifficulty && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                <Gauge className="w-3 h-3 text-purple-600" /> Level: {prefs.targetDifficulty}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-surface-900">{session.title}</h1>
        </div>

        <Link to={`/quiz?session=${session.id}`}>
          <Button size="lg" icon={ArrowRight}>
            Start Practice Quiz
          </Button>
        </Link>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-surface-200 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Study Session Tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all focus:outline-none rounded-t-lg ${
              activeTab === 'summary'
                ? 'border-brand-600 text-brand-600 bg-brand-50/40'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'concept-map'}
            onClick={() => setActiveTab('concept-map')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all focus:outline-none rounded-t-lg flex items-center gap-1.5 ${
              activeTab === 'concept-map'
                ? 'border-brand-600 text-brand-600 bg-brand-50/40'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Network className="w-4 h-4 text-brand-600" /> Concept Map ({session.conceptMap?.nodes?.length || 0})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'topics'}
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all focus:outline-none rounded-t-lg ${
              activeTab === 'topics'
                ? 'border-brand-600 text-brand-600 bg-brand-50/40'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Key Topics ({session.keyTopics?.length || 0})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'concepts'}
            onClick={() => setActiveTab('concepts')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all focus:outline-none rounded-t-lg ${
              activeTab === 'concepts'
                ? 'border-brand-600 text-brand-600 bg-brand-50/40'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Concepts & Glossary ({(session.importantConcepts?.length || 0) + (session.definitions?.length || 0)})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'tips'}
            onClick={() => setActiveTab('tips')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all focus:outline-none rounded-t-lg ${
              activeTab === 'tips'
                ? 'border-brand-600 text-brand-600 bg-brand-50/40'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Exam Tips & Priorities
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search material content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-surface-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'summary' && (
        <Card>
          <CardHeader>
            <CardTitle>Material Overview</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none text-sm text-surface-700 leading-relaxed whitespace-pre-line">
            {session.summary}
          </CardContent>
        </Card>
      )}

      {/* Tab: Interactive Concept Map */}
      {activeTab === 'concept-map' && (
        <ConceptMap
          conceptMap={session.conceptMap}
          weakTopics={session.recommendedRevisionAreas || []}
        />
      )}

      {/* Tab 2: Key Topics with Source Badges */}
      {activeTab === 'topics' && (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTopics.length > 0 ? (
            filteredTopics.map((item, idx) => (
              <Card key={idx} className="flex flex-col justify-between hover:border-brand-300 transition-colors">
                <CardHeader className="flex flex-col gap-2 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{item.topic}</CardTitle>
                    <Badge variant={item.importance === 'High' ? 'danger' : item.importance === 'Medium' ? 'warning' : 'neutral'}>
                      {item.importance} Priority
                    </Badge>
                  </div>
                  {renderSourceBadge(item.source)}
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-surface-600 leading-relaxed">
                  <p>{item.description}</p>
                  <div className="pt-2 border-t border-surface-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Sparkles}
                      className="text-[11px] font-semibold text-brand-700 bg-brand-50/60 border-brand-200 hover:bg-brand-100/60"
                      onClick={() => openExplainModal(item.topic, item.description)}
                    >
                      Explain Differently
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-xs text-surface-500 py-4 col-span-2 text-center">
              No matching topics found for "{searchQuery}".
            </p>
          )}
        </div>
      )}

      {/* Tab 3: Concepts & Definitions with Source Badges */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          {/* Important Concepts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider">Important Concepts</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredConcepts.map((item, idx) => (
                <Card key={idx} className="flex flex-col justify-between">
                  <CardHeader className="flex flex-col gap-2 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{item.concept}</CardTitle>
                      <button
                        onClick={() => handleCopyText(`${item.concept}: ${item.explanation}`, `concept_${idx}`)}
                        className="p-1 text-surface-400 hover:text-surface-600 rounded transition-colors"
                        title="Copy explanation"
                      >
                        {copiedTerm === `concept_${idx}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {renderSourceBadge(item.source)}
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-surface-600">
                    <p>{item.explanation}</p>
                    {item.examples && item.examples.length > 0 && (
                      <div className="p-2 bg-surface-50 rounded border border-surface-100 font-mono text-[11px] text-surface-700">
                        <strong>Example:</strong> {item.examples.join(', ')}
                      </div>
                    )}
                    <div className="pt-2 border-t border-surface-100 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Sparkles}
                        className="text-[11px] font-semibold text-brand-700 bg-brand-50/60 border-brand-200 hover:bg-brand-100/60"
                        onClick={() => openExplainModal(item.concept, item.explanation)}
                      >
                        Explain Differently
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Key Definitions */}
          <div className="space-y-3 pt-4 border-t border-surface-200">
            <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider">Terminology Glossary</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {filteredDefinitions.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white border border-surface-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-xs text-brand-900">{item.term}</span>
                      <button
                        onClick={() => handleCopyText(`${item.term}: ${item.definition}`, `def_${idx}`)}
                        className="p-1 text-surface-400 hover:text-surface-600 rounded transition-colors"
                      >
                        {copiedTerm === `def_${idx}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-surface-600 leading-relaxed">{item.definition}</p>
                    {renderSourceBadge(item.source)}
                  </div>
                  <div className="pt-2 border-t border-surface-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Sparkles}
                      className="text-[11px] font-semibold text-brand-700 bg-brand-50/60 border-brand-200 hover:bg-brand-100/60"
                      onClick={() => openExplainModal(item.term, item.definition)}
                    >
                      Explain Differently
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Exam Tips */}
      {activeTab === 'tips' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Exam-Focused Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.examTips?.map((tip, idx) => (
                <div key={idx} className="p-3 bg-white border border-amber-200 rounded-xl text-xs text-surface-800 leading-relaxed">
                  💡 {tip}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-brand-50/30">
            <CardHeader>
              <CardTitle className="text-brand-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600" />
                High-Priority Revision Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.recommendedRevisionAreas?.map((area, idx) => (
                <div key={idx} className="p-3 bg-white border border-brand-200 rounded-xl text-xs text-surface-800 leading-relaxed">
                  🎯 <strong>Focus Area:</strong> {area}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Explain Differently Modal */}
      <ExplainModal
        isOpen={explainModalState.isOpen}
        onClose={closeExplainModal}
        sessionId={session?.id}
        concept={explainModalState.concept}
        existingExplanation={explainModalState.existingExplanation}
      />
    </div>
  );
};
