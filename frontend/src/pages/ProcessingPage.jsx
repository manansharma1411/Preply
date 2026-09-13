import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { materialsAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Brain, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

export const ProcessingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, title, preferences } = location.state || {};

  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);

  const processUpload = async () => {
    if (!file) {
      const timer = setTimeout(() => {
        setCurrentStep(4);
        setStatus('success');
      }, 1500);
      return () => clearTimeout(timer);
    }

    setStatus('processing');
    setCurrentStep(1);
    setErrorMessage(null);

    const t1 = setTimeout(() => setCurrentStep(2), 600);
    const t2 = setTimeout(() => setCurrentStep(3), 1400);

    try {
      const response = await materialsAPI.uploadDocument(file, title, preferences);
      clearTimeout(t1);
      clearTimeout(t2);

      if (response.success && response.data) {
        setSessionResult(response.data.studySession);
        setCurrentStep(5);
        setStatus('success');
      } else {
        throw new Error(response.message || 'Processing failed');
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to analyze PDF document. Please try again.');
    }
  };

  useEffect(() => {
    processUpload();
  }, []);

  const steps = [
    { num: 1, label: 'Uploading PDF Document' },
    { num: 2, label: 'Extracting Plain Text & Validation' },
    { num: 3, label: 'Gemini AI Synthesizing Study Kit & Quiz' },
    { num: 4, label: 'Finalizing Study Session' },
  ];

  const handleOpenStudy = () => {
    if (sessionResult?.id) {
      navigate(`/study/${sessionResult.id}`);
    } else {
      navigate('/study');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="text-center">
        <CardContent className="space-y-6 py-8">
          <div className="relative inline-flex items-center justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'
            }`}>
              <Brain className={`w-8 h-8 ${status === 'processing' ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-surface-900">
              {status === 'success'
                ? 'Processing Complete!'
                : status === 'error'
                ? 'Processing Failed'
                : 'Analyzing Document'}
            </h2>
            <p className="text-xs text-surface-500 max-w-xs mx-auto">
              {title || file?.name || 'Document Analysis'}
            </p>
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-3 pt-4 border-t border-surface-100 text-left text-xs font-medium">
            {steps.map((step) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num && status === 'processing';

              return (
                <div key={step.num} className="flex items-center gap-2.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Spinner size="sm" className="flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-surface-300 flex-shrink-0" />
                  )}
                  <span className={isCompleted ? 'text-surface-900' : isCurrent ? 'text-brand-600 font-semibold' : 'text-surface-400'}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Message & Retry */}
          {status === 'error' && (
            <div className="space-y-4 pt-2">
              <Alert variant="danger" title="Processing Error">
                {errorMessage || 'Failed to extract or analyze document text. Please try again.'}
              </Alert>
              <div className="flex gap-2">
                <Link to="/upload" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full" icon={RotateCcw}>
                    Retry Upload
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Success State Actions */}
          {status === 'success' && (
            <div className="pt-4 border-t border-surface-100">
              <Button
                size="md"
                className="w-full"
                icon={ArrowRight}
                onClick={handleOpenStudy}
              >
                Open Study Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
