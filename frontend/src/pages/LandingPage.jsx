import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Upload,
  BookOpen,
  Brain,
  Target,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const LandingPage = () => {
  const { user } = useAuth();

  const steps = [
    {
      num: '01',
      title: 'Upload Course Material',
      desc: 'Upload course PDFs, chapter notes, or textbook materials into your student workspace.',
      icon: Upload,
    },
    {
      num: '02',
      title: 'AI Analysis & Kit Synthesis',
      desc: 'Preply extracts key concepts, definitions, summaries, and exam-focused revision priorities.',
      icon: Brain,
    },
    {
      num: '03',
      title: 'Practice Quiz & Weak Topics',
      desc: 'Take interactive quizzes, receive immediate scoring, and pinpoint exact weak topics needing review.',
      icon: Target,
    },
  ];

  const features = [
    {
      title: 'Strict Grounding (Zero Hallucination)',
      desc: 'Analysis and quiz generation are strictly derived from your uploaded PDF text. No invented facts.',
      icon: ShieldCheck,
    },
    {
      title: 'Executive Study Kits',
      desc: 'Structured overview, key topics, terminology glossaries, and exam-focused revision points.',
      icon: Layers,
    },
    {
      title: 'Interactive Diagnostics',
      desc: 'Automated quiz scoring, percentage statistics, and topic-by-topic accuracy tracking.',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <Badge variant="brand" className="px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
          Grounded AI Exam Preparation Workspace
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-surface-900 leading-tight">
          Master Course Notes With Grounded Active Recall
        </h1>
        <p className="text-base sm:text-lg text-surface-600 leading-relaxed max-w-2xl mx-auto font-normal">
          Preply transforms your PDF lecture notes and textbooks into structured study kits and interactive diagnostic quizzes—pinpointing exact weak topics before your exams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
          <Link to={user ? '/upload' : '/register'}>
            <Button size="lg" icon={ArrowRight} className="w-full sm:w-auto shadow-md">
              {user ? 'Upload Study Material' : 'Get Started Free'}
            </Button>
          </Link>
          <Link to={user ? '/dashboard' : '/login'}>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              {user ? 'Open Dashboard' : 'Sign In to Workspace'}
            </Button>
          </Link>
        </div>

        {/* Supported Format Indicator */}
        <div className="inline-flex items-center gap-2 pt-2 px-3 py-1.5 rounded-full bg-surface-100/80 border border-surface-200 text-xs font-semibold text-surface-600">
          <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>Primary Supported Format: <strong className="text-surface-900 font-bold">PDF</strong> (DOCX & PPTX pipeline ready)</span>
        </div>
      </section>

      {/* 3-Step Core Workflow */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900">The Preply Learning Journey</h2>
          <p className="text-xs sm:text-sm text-surface-500">
            A proven 3-stage loop engineered for retention and exam readiness.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.num} className="relative overflow-hidden group hover:border-brand-300 hover:shadow-md transition-all">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-surface-300 group-hover:text-brand-500 transition-colors">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-surface-900">{step.title}</h3>
                  <p className="text-xs text-surface-600 leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Grounded AI Features Grid */}
      <section className="bg-white border border-surface-200 rounded-3xl p-8 sm:p-10 space-y-8 shadow-xs">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="success" className="px-3 py-1 font-bold">Academic Integrity & Precision</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900">Engineered for Real Student Success</h2>
          <p className="text-xs sm:text-sm text-surface-500">
            Built specifically to eliminate generic AI chatter and focus strictly on your target syllabus.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl border border-surface-200 bg-surface-50/50 space-y-3 transition-colors hover:bg-white hover:shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 text-brand-600 flex items-center justify-center shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-surface-900">{feat.title}</h3>
                <p className="text-xs text-surface-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Callout Banner */}
        <div className="bg-gradient-to-r from-brand-900 to-surface-900 text-white rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold">Ready to Launch Your First Study Kit?</h3>
            <p className="text-xs sm:text-sm text-brand-200">
              Upload your PDF lecture notes or textbook chapter to generate practice quizzes now.
            </p>
          </div>
          <Link to={user ? '/upload' : '/register'} className="flex-shrink-0 w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto bg-white text-brand-950 hover:bg-brand-50 border-none font-bold" icon={ArrowRight}>
              Upload PDF Material
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
