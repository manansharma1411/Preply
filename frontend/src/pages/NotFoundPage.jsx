import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileQuestion, ArrowRight, LayoutDashboard } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <Card>
        <CardContent className="space-y-6 py-10">
          <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-surface-900">404</h1>
            <h2 className="text-lg font-bold text-surface-800">Page Not Found</h2>
            <p className="text-xs text-surface-500 max-w-xs mx-auto pt-1">
              The workspace page or study material you requested could not be located.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Link to="/dashboard">
              <Button icon={LayoutDashboard}>Return to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
