import React, { useState, useEffect } from 'react';
import { sessionsAPI } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import {
  Sparkles,
  X,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  GraduationCap,
  Puzzle,
  Lightbulb,
  FileText,
} from 'lucide-react';

export const ExplainModal = ({
  isOpen,
  onClose,
  sessionId,
  concept,
  existingExplanation = '',
}) => {
  const [activeMode, setActiveMode] = useState('Explain simply');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const modes = [
    { label: 'Explain simply', icon: Lightbulb, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { label: 'Give an example', icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { label: 'Give an analogy', icon: Puzzle, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    { label: 'Explain for an exam answer', icon: GraduationCap, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  ];

  const handleGenerate = async (mode = activeMode) => {
    if (!sessionId || !concept) return;
    setActiveMode(mode);
    setLoading(true);
    setError(null);
    try {
      const res = await sessionsAPI.explainConcept(
        sessionId,
        concept,
        mode,
        existingExplanation
      );
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        throw new Error(res.message || 'Failed to generate alternative explanation.');
      }
    } catch (err) {
      setError(err.message || 'Unable to generate explanation right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && concept) {
      setResult(null);
      setError(null);
      handleGenerate('Explain simply');
    }
  }, [isOpen, concept, sessionId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (result?.alternativeExplanation && navigator.clipboard) {
      navigator.clipboard.writeText(result.alternativeExplanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-surface-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-surface-900 line-clamp-1">{concept}</h3>
                <Badge variant="brand" className="text-[11px] font-semibold">
                  Explain Differently
                </Badge>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Contextual AI re-explanation grounded in study material
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Explanation Style Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
              Choose Explanation Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {modes.map((m) => {
                const IconComponent = m.icon;
                const isSelected = activeMode === m.label;

                return (
                  <button
                    key={m.label}
                    onClick={() => handleGenerate(m.label)}
                    disabled={loading}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all text-xs ${
                      isSelected
                        ? `${m.color} ring-2 ring-brand-500 font-bold shadow-2xs`
                        : 'border-surface-200 bg-white hover:bg-surface-50 text-surface-700 font-medium'
                    } ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center space-y-3 bg-surface-50/50 rounded-xl border border-surface-100">
              <Spinner size="lg" className="mx-auto text-brand-600" />
              <p className="text-xs font-bold text-surface-800">
                Generating alternative explanation in style "{activeMode}"...
              </p>
              <p className="text-[11px] text-surface-500">
                Grounded strictly in your uploaded PDF study material.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Alert variant="danger" title="Explanation Error">
              <div className="space-y-3">
                <p>{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  icon={RotateCcw}
                  onClick={() => handleGenerate(activeMode)}
                >
                  Retry Request
                </Button>
              </div>
            </Alert>
          )}

          {/* Generated Result */}
          {result && !loading && !error && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-surface-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Re-Explanation ({result.explanationMode})
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>

              <Card className="bg-surface-50/80 border-surface-200 p-4">
                <div className="prose max-w-none text-xs text-surface-800 leading-relaxed whitespace-pre-line font-medium">
                  {result.alternativeExplanation}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-surface-100 bg-surface-50/50 flex items-center justify-between">
          <span className="text-[11px] text-surface-400">
            Original study guide explanation is preserved untouched.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
