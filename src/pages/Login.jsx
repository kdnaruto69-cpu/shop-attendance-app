import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, Key, User, Store } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Require the user to type their password
    if (!password) {
      setErrorMsg('Please enter your password.');
      setLoading(false);
      return;
    }

    // Normalize username: lowercase and trim
    const normalizedUsername = username.trim().toLowerCase();

    // Convert username to email format for Supabase auth
    let loginEmail = normalizedUsername;
    if (normalizedUsername === 'owner') {
      loginEmail = 'owner@shop.com';
    } else if (normalizedUsername === 'naro') {
      loginEmail = 'naro@shop.com';
    } else if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@shop.com`;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) throw error;
    } catch {
      setErrorMsg('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Store size={28} />
          </div>
          <h2 className="logo-text" style={{ fontSize: '1.65rem' }}>V MART Attendance</h2>
          <p className="mt-2">Sign in with your username and password</p>
        </div>

        {errorMsg && (
          <div className="alert-banner danger">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
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
                placeholder="Enter your username"
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

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></span>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn size={18} />
                Sign In
              </span>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
