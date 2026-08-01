import React from 'react';
import { supabase } from '../supabaseClient';
import { Clock, LogOut } from 'lucide-react';

export default function Pending() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card text-center pending-screen">
        <div className="pending-icon">
          <Clock size={48} className="spinner" style={{ animationDuration: '6s' }} />
        </div>
        <h2 className="pending-title">Account Approval Pending</h2>
        <p className="pending-desc">
          Your account has been created successfully, but is currently in <strong>Pending</strong> status. 
          An existing Owner must approve your account and assign your role (Owner or Manager) 
          before you can access the system.
        </p>
        <p className="pending-desc" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Please contact the shop owner to activate your account. 
          You can refresh the page once approved, or sign out below.
        </p>

        <button onClick={handleLogout} className="btn btn-secondary btn-block mt-4 flex items-center justify-center gap-2">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
