import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, UserCheck, UserX, Clock, Search, 
  RefreshCw, Check, LogOut, Store, LogIn, LogOut as CheckOutIcon
} from 'lucide-react';

export default function ManagerDashboard({ userProfile }) {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Get current local date string (YYYY-MM-DD)
  const getLocalDateString = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayStr = getLocalDateString();

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (staffError) throw staffError;

      // 2. Fetch today's attendance
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayStr);

      if (attError) throw attError;

      // Map attendance by staff_id for easy lookup
      const attMap = {};
      attData.forEach(item => {
        attMap[item.staff_id] = item;
      });

      setStaff(staffData);
      setAttendance(attMap);
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const markPresent = async (staffId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          staff_id: staffId,
          date: todayStr,
          status: 'present',
          in_time: nowIso,
          out_time: null,
          updated_by: userProfile.id,
          updated_at: nowIso
        });

      if (error) throw error;
      setSuccessMsg('Attendance marked as PRESENT.');
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error marking present.');
    }
  };

  const markAbsent = async (staffId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          staff_id: staffId,
          date: todayStr,
          status: 'absent',
          in_time: null,
          out_time: null,
          updated_by: userProfile.id,
          updated_at: nowIso
        });

      if (error) throw error;
      setSuccessMsg('Attendance marked as ABSENT.');
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error marking absent.');
    }
  };

  const checkOut = async (staffId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          out_time: nowIso,
          updated_by: userProfile.id,
          updated_at: nowIso
        })
        .eq('staff_id', staffId)
        .eq('date', todayStr);

      if (error) throw error;
      setSuccessMsg('Staff checked out successfully.');
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error checking out.');
    }
  };

  const resetToday = async (staffId) => {
    if (!window.confirm('Are you sure you want to reset today\'s attendance for this staff?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('staff_id', staffId)
        .eq('date', todayStr);

      if (error) throw error;
      setSuccessMsg('Today\'s record reset.');
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error resetting attendance.');
    }
  };

  // Stats calculation
  const totalStaffCount = staff.length;
  let presentCount = 0;
  let absentCount = 0;
  let pendingCount = 0;

  staff.forEach(s => {
    const record = attendance[s.id];
    if (!record) {
      pendingCount++;
    } else if (record.status === 'present') {
      presentCount++;
    } else if (record.status === 'absent') {
      absentCount++;
    }
  });

  // Filter staff list
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.phone && s.phone.includes(searchQuery));
    
    const record = attendance[s.id];
    const status = record ? record.status : 'pending';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      <div className="dashboard-layout" style={{ flexDirection: 'column' }}>
        
        {/* Navigation Bar */}
        <header className="sidebar" style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', borderRight: 'none', padding: '1rem 2rem', minHeight: 'auto' }}>
          <div className="sidebar-logo" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <Store size={22} />
            <span className="logo-text" style={{ fontSize: '1.05rem' }}>V MART Attendance</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="sidebar-user" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.02)' }}>
              <span className="user-name">{userProfile.full_name || userProfile.email}</span>
              <span className="user-role">Manager</span>
            </div>
            <button onClick={handleLogout} className="btn-logout" style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}>
              <LogOut size={16} />
              <span style={{ display: 'none', md: 'inline' }}>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dashboard Main Area */}
        <main className="main-content" style={{ padding: '2rem 1.5rem' }}>
          
          <div className="header-container">
            <div className="page-title">
              <h1>Today's Attendance</h1>
              <p>Daily shift tracker for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div className="header-actions">
              <button onClick={loadData} className="btn btn-secondary" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
                <RefreshCw size={16} className={loading ? 'spinner' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="alert-banner danger">
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="alert-banner success">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Stats Summary Panel */}
          <div className="dashboard-grid">
            <div className="glass-card stat-card">
              <div className="stat-icon primary">
                <Users size={22} />
              </div>
              <div className="stat-details">
                <span className="stat-value">{totalStaffCount}</span>
                <span className="stat-label">Total Staff</span>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon success">
                <UserCheck size={22} />
              </div>
              <div className="stat-details">
                <span className="stat-value">{presentCount}</span>
                <span className="stat-label">Present</span>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon danger">
                <UserX size={22} />
              </div>
              <div className="stat-details">
                <span className="stat-value">{absentCount}</span>
                <span className="stat-label">Absent</span>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="stat-icon warning">
                <Clock size={22} />
              </div>
              <div className="stat-details">
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">Not Marked</span>
              </div>
            </div>
          </div>

          {/* Staff Attendance Control Card */}
          <div className="glass-card">
            <h2 className="mb-4">Mark Attendance</h2>
            
            {/* Search and Filters */}
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search 
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
                  placeholder="Search staff by name..."
                  className="input-control"
                  style={{ paddingLeft: '2.5rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-wrapper">
                <button 
                  onClick={() => setStatusFilter('all')} 
                  className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  All Active
                </button>
                <button 
                  onClick={() => setStatusFilter('pending')} 
                  className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Not Marked ({pendingCount})
                </button>
                <button 
                  onClick={() => setStatusFilter('present')} 
                  className={`btn btn-sm ${statusFilter === 'present' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Present ({presentCount})
                </button>
                <button 
                  onClick={() => setStatusFilter('absent')} 
                  className={`btn btn-sm ${statusFilter === 'absent' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Absent ({absentCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="spinner-container">
                <div className="spinner"></div>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center" style={{ padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                No active staff members found matching the filters.
              </div>
            ) : (
              <div className="staff-card-list">
                {filteredStaff.map(s => {
                  const record = attendance[s.id];
                  const isMarked = !!record;
                  const isPresent = record?.status === 'present';
                  const isAbsent = record?.status === 'absent';
                  
                  return (
                    <div key={s.id} className="staff-row-card">
                      <div className="staff-card-info">
                        <div className="staff-card-name">{s.name}</div>
                        <div className="staff-card-meta">
                          {s.phone && <span>Phone: {s.phone}</span>}
                          <span>Shift starts: {s.expected_in_time ? s.expected_in_time.slice(0, 5) : '09:00'}</span>
                        </div>
                      </div>

                      {/* Display Status Badge */}
                      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                        {isMarked ? (
                          <>
                            {isPresent ? (
                              <div className="flex items-center gap-2">
                                <span className="badge badge-success">Present</span>
                                <span style={{ fontSize: '0.85rem' }} className="flex items-center gap-1">
                                  <LogIn size={14} /> {formatTime(record.in_time)}
                                </span>
                                {record.out_time ? (
                                  <span style={{ fontSize: '0.85rem' }} className="flex items-center gap-1">
                                    <CheckOutIcon size={14} /> {formatTime(record.out_time)}
                                  </span>
                                ) : (
                                  <button onClick={() => checkOut(s.id)} className="btn btn-warning btn-sm flex items-center gap-1">
                                    <CheckOutIcon size={14} /> Check Out
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="badge badge-danger">Absent</span>
                            )}
                            
                            {/* Reset option for today only */}
                            <button 
                              onClick={() => resetToday(s.id)} 
                              className="btn btn-secondary btn-sm" 
                              title="Reset attendance for today"
                              style={{ padding: '0.35rem' }}
                            >
                              <RefreshCw size={12} />
                            </button>
                          </>
                        ) : (
                          <div className="staff-card-actions">
                            <button onClick={() => markPresent(s.id)} className="btn btn-success btn-sm flex items-center gap-1">
                              <UserCheck size={14} /> Mark Present
                            </button>
                            <button onClick={() => markAbsent(s.id)} className="btn btn-danger btn-sm flex items-center gap-1">
                              <UserX size={14} /> Mark Absent
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
