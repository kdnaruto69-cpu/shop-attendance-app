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

  const fetchProfile = async (userId, userEmail) => {
    // 1. Owner hard bypass check
    if (userEmail === 'owner@shop.com' || (userEmail && userEmail.toLowerCase().startsWith('owner'))) {
      setProfile({ id: userId, role: 'owner', full_name: 'Owner', email: userEmail, approved: true });
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      // 2. Fetch current profile record cleanly
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile exists, or if role is currently pending
      if (!profileData || profileData.role === 'pending') {
        // Query the profiles table to check the total count of existing profiles
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // ONLY perform automatic owner creation/promotion IF count === 0
        if (count === 0) {
          const newProfile = {
            id: userId,
            email: userEmail,
            full_name: 'Owner',
            role: 'owner',
            updated_at: new Date().toISOString()
          };

          const { data: upsertedData, error: upsertError } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle();

          if (upsertError) throw upsertError;
          profileData = upsertedData || newProfile;
        } else if (!profileData) {
          // If profiles exist in the system, but this profile doesn't, create it as pending
          const newProfile = {
            id: userId,
            email: userEmail,
            full_name: 'Pending User',
            role: 'pending',
            updated_at: new Date().toISOString()
          };
          await supabase.from('profiles').upsert(newProfile);
          profileData = newProfile;
        }
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error in fetchProfile flow:', error);
      setProfile({ id: userId, role: 'pending', email: userEmail });
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      if (activeSession) {
        fetchProfile(activeSession.user.id, activeSession.user.email);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen to changes in auth state
    const { data: authListener } = supabase.auth.onAuthStateChange((event, activeSession) => {
      setSession(activeSession);
      if (activeSession) {
        fetchProfile(activeSession.user.id, activeSession.user.email);
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

  // Signed in - check roles with hard owner bypass
  const user = session?.user;

  if (profile?.role !== 'owner' && profile?.role !== 'manager' && user?.email !== 'owner@shop.com') {
    return <Pending />;
  }

  if (profile?.role === 'owner' || user?.email === 'owner@shop.com') {
    const finalProfile = profile?.role === 'owner' ? profile : { id: user.id, role: 'owner', full_name: 'Owner', email: user.email, approved: true };
    return <OwnerDashboard userProfile={finalProfile} />;
  }

  if (profile?.role === 'manager') {
    return <ManagerDashboard userProfile={profile} />;
  }

  // Fallback for role = 'pending' or other
  return <Pending />;
}
