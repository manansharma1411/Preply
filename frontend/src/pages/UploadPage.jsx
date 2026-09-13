import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileDropzone } from '../components/upload/FileDropzone';
import { ArrowRight, Sliders, Sparkles, Clock, Target, Gauge } from 'lucide-react';

export const UploadPage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  // Preference state with sensible defaults
  const [subject, setSubject] = useState('');
  const [studyGoal, setStudyGoal] = useState('Semester Exam');
  const [studyTime, setStudyTime] = useState('30 minutes');
  const [targetDifficulty, setTargetDifficulty] = useState('Intermediate');

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (!title) {
      const defaultTitle = file.name.replace(/\.[^/.]+$/, '');
      setTitle(defaultTitle);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile) {
      navigate('/processing', {
        state: {
          file: selectedFile,
          title: title || selectedFile.name.replace(/\.[^/.]+$/, ''),
          preferences: {
            subject: subject || 'General',
            studyGoal,
            studyTime,
            targetDifficulty,
          },
        },
      });
    }
  };

  const goals = [
    { name: 'Quick Revision', desc: 'Concise review, key concepts & 3 questions' },
    { name: 'Internal Exam', desc: 'Focused coverage & 4 questions' },
    { name: 'Semester Exam', desc: 'Comprehensive syllabus & 5 questions' },
    { name: 'Deep Understanding', desc: 'Detailed theory, edge cases & 7 questions' },
  ];

  const timeOptions = ['15 minutes', '30 minutes', '1 hour', '2+ hours'];
  const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-surface-900">Upload Study Material</h1>
        <p className="text-sm text-surface-500">
          Upload PDF lecture notes or textbook chapters to extract grounded key concepts and personalized practice quizzes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Document & Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Session Title"
              placeholder="e.g. Operating Systems Chapter 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <FileDropzone
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onClearFile={handleClearFile}
            />

            {/* Optional Personalization Preferences Toggle */}
            <div className="pt-2 border-t border-surface-100">
              <button
                type="button"
                onClick={() => setShowPreferences((prev) => !prev)}
                className="flex items-center justify-between w-full p-3 bg-surface-50 hover:bg-surface-100 rounded-xl border border-surface-200 text-xs font-semibold text-surface-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  <span>Personalize AI Study Goal & Difficulty</span>
                  <span className="text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 font-bold">
                    Optional
                  </span>
                </div>
                <span className="text-surface-400 font-bold">{showPreferences ? 'Hide' : 'Customize'}</span>
              </button>

              {showPreferences && (
                <div className="mt-4 p-4 bg-white border border-surface-200 rounded-2xl space-y-4 shadow-xs">
                  {/* Subject / Course Name */}
                  <Input
                    label="Subject / Course Name (Optional)"
                    placeholder="e.g. Computer Science CS301"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />

                  {/* Study Goal Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-brand-600" /> Study Goal
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {goals.map((g) => {
                        const isSelected = studyGoal === g.name;
                        return (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => setStudyGoal(g.name)}
                            className={`p-3 text-left rounded-xl border text-xs transition-all ${
                              isSelected
                                ? 'border-brand-500 bg-brand-50/70 text-brand-950 font-semibold ring-1 ring-brand-500'
                                : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'
                            }`}
                          >
                            <div className="font-bold">{g.name}</div>
                            <div className="text-[11px] text-surface-500 mt-0.5">{g.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Available Study Time */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Available Study Time
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {timeOptions.map((t) => {
                        const isSelected = studyTime === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setStudyTime(t)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                                : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preferred Difficulty */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-purple-600" /> Preferred Difficulty
                    </label>
                    <div className="flex gap-2">
                      {difficultyLevels.map((d) => {
                        const isSelected = targetDifficulty === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setTargetDifficulty(d)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500'
                                : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!selectedFile}
              icon={ArrowRight}
            >
              Start Analysis & Material Generation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
