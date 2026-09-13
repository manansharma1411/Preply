import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-surface-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-surface-900">Preply</span>
          </Link>
          <p className="text-sm text-surface-500">AI-Powered Exam Preparation Workspace</p>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
