import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Key, User, Store, ShieldAlert } from 'lucide-react';

export default function Signup({ onLoginClick }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Convert username to email format for Supabase auth
    let signupEmail = username.trim();
    if (!signupEmail.includes('@')) {
      signupEmail = `${signupEmail}@shop.com`;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card text-center">
          <div className="auth-logo" style={{ color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
            <UserPlus size={28} />
          </div>
          <h2 className="mb-2">Registration Successful</h2>
          <div className="alert-banner success mb-4" style={{ textAlign: 'left' }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Note:</strong> New accounts start with a <strong>pending</strong> status. 
              If you are the very first user, your account will be auto-approved as <strong>Owner</strong>.
              Otherwise, please ask an existing Owner to approve your account.
            </div>
          </div>
          <button onClick={onLoginClick} className="btn btn-primary btn-block">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Store size={28} />
          </div>
          <h2 className="logo-text" style={{ fontSize: '1.65rem' }}>V MART Attendance</h2>
          <p className="mt-2">Register as an Owner or Manager</p>
        </div>

        {errorMsg && (
          <div className="alert-banner danger">
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="alert-banner warning mb-4" style={{ fontSize: '0.85rem' }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>The first registered account becomes the <strong>Owner</strong>. Subsequent signups start as <strong>pending</strong>.</span>
        </div>

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="text"
                required
                className="input-control"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="text"
                required
                className="input-control"
                placeholder="e.g. rachel"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Key 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="password"
                required
                className="input-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Key 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="password"
                required
                className="input-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></span>
                Registering...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus size={18} />
                Register
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <a href="#login" onClick={onLoginClick}>
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
