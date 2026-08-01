import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Pending from './pages/Pending';
import ManagerDashboard from './pages/ManagerDashboard';
import OwnerDashboard from './pages/OwnerDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
      } else {
        // Fallback role pending
        setProfile({ id: userId, role: 'pending', email: session?.user?.email });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile({ id: userId, role: 'pending', email: session?.user?.email });
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      if (activeSession) {
        fetchProfile(activeSession.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen to changes in auth state
    const { data: authListener } = supabase.auth.onAuthStateChange((event, activeSession) => {
      setSession(activeSession);
      if (activeSession) {
        fetchProfile(activeSession.user.id);
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Realtime Subscription for Role Updates (e.g. pending -> manager/owner transitions)
  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel('realtime-profile-role')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log('Realtime profile update received:', payload.new);
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!session) {
    return <Login />;
  }

  // Signed in - check roles
  if (!profile) {
    return <Pending />;
  }

  if (profile.role === 'owner') {
    return <OwnerDashboard userProfile={profile} />;
  }

  if (profile.role === 'manager') {
    return <ManagerDashboard userProfile={profile} />;
  }

  // Fallback for role = 'pending' or other
  return <Pending />;
}
