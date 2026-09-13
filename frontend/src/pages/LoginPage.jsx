import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { LogIn, Sparkles, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (res.success) {
        addToast('Welcome back to Preply!', 'success');
        navigate(from, { replace: true });
      } else {
        throw new Error(res.message || 'Invalid email or password');
      }
    } catch (err) {
      // If account does not exist yet on fresh database, auto-create account seamlessly
      try {
        const nameFromEmail = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim() || 'Student';
        const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        const regRes = await register(formattedName, email, password);
        if (regRes && regRes.success) {
          addToast('Account created and signed in successfully!', 'success');
          navigate(from, { replace: true });
          return;
        }
      } catch (regErr) {
        // Ignore fallback error and present original error message
      }
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = async () => {
    const demoEmail = 'student.demo@university.edu';
    const demoPass = 'Password123!';
    setEmail(demoEmail);
    setPassword(demoPass);

    setLoading(true);
    setError(null);
    try {
      let res;
      try {
        res = await login(demoEmail, demoPass);
      } catch (loginErr) {
        // Auto-register demo account on fresh database
        res = await register('Demo Student', demoEmail, demoPass);
      }

      if (res && res.success) {
        addToast('Signed in with Demo Account', 'success');
        navigate(from, { replace: true });
      } else {
        throw new Error(res?.message || 'Demo sign-in failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to execute demo login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-surface-900">Sign in to Preply</h2>
        <p className="text-xs text-surface-500">
          Enter your student account credentials below
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Authentication Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="alex@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" loading={loading} className="w-full" icon={LogIn}>
          Sign In to Workspace
        </Button>
      </form>

      {/* Quick Demo Helper */}
      <div className="pt-4 border-t border-surface-200 text-center space-y-3">
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>Hackathon Evaluator?</span>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Demo Sign-In
          </button>
        </div>

        <p className="text-center text-xs text-surface-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create student account
          </Link>
        </p>
      </div>
    </div>
  );
};
