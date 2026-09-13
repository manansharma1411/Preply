import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { User, Shield, Sliders, Bell, LogOut, Trash2, CheckCircle2 } from 'lucide-react';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [difficulty, setDifficulty] = useState('Medium');
  const [notifications, setNotifications] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleSavePreferences = () => {
    addToast('Study preferences updated successfully', 'success');
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out successfully', 'info');
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header Profile Summary Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {getInitials(user?.name)}
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{user?.name || 'Student Account'}</CardTitle>
              <p className="text-xs text-surface-500">{user?.email || 'alex@university.edu'}</p>
              <Badge variant="brand" className="mt-1">
                Student Workspace Active
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" icon={LogOut} onClick={handleLogout}>
            Sign Out
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 border-t border-surface-100">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Full Name" value={user?.name || ''} readOnly />
            <Input label="Email Address" value={user?.email || ''} readOnly />
          </div>
        </CardContent>
      </Card>

      {/* Study Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sliders className="w-5 h-5 text-brand-600" />
            Study & Quiz Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-surface-700">
          <div className="space-y-2">
            <label className="font-bold text-surface-900 block">Default Quiz Difficulty</label>
            <div className="flex gap-3">
              {['Easy', 'Medium', 'Hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    difficulty === level
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-2xs'
                      : 'border-surface-200 hover:border-surface-300 bg-white text-surface-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-50/70 rounded-2xl border border-surface-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-brand-600" />
              <div>
                <p className="font-bold text-surface-900">Spaced-Repetition Reminders</p>
                <p className="text-[11px] text-surface-500 font-medium">Receive revision notifications for weak topics</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              role="switch"
              aria-checked={notifications}
              aria-label="Toggle Spaced-Repetition Reminders"
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                notifications ? 'bg-brand-600' : 'bg-surface-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  notifications ? 'transform translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <Button size="sm" icon={CheckCircle2} onClick={handleSavePreferences} className="font-semibold">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone Account Actions */}
      <Card className="border-rose-200 bg-rose-50/20">
        <CardHeader>
          <CardTitle className="text-rose-900 text-base font-semibold">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-surface-700">
          <p>Clear session tokens or log out securely from all devices.</p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              size="sm"
              icon={LogOut}
              onClick={() => setConfirmModalOpen(true)}
            >
              Sign Out Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Sign Out Confirmation"
      >
        <div className="space-y-4 text-xs text-surface-600">
          <p>Are you sure you want to sign out of your Preply student workspace?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              Confirm Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
