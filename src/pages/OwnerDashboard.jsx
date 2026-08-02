import React, { useState, useEffect, useCallback } from 'react';
import { supabase, createSecondaryClient } from '../supabaseClient';
import { 
  Users, UserCheck, UserX, Clock, Shield, Search, 
  Edit2, Trash2, FileText, Download, Save, RefreshCw, LogOut, Store, Check, AlertCircle, X, Wallet
} from 'lucide-react';
import Expenses from './Expenses';

// Subcomponent for each staff attendance card with Owner management actions
function OwnerStaffAttendanceCard({ staffMember, record, onMarkPresent, onMarkAbsent, onCheckOut, onReset, onUpdateTimes }) {
  const isMarked = !!record;
  const isPresent = record?.status === 'present';

  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [isEditingTimes, setIsEditingTimes] = useState(false);

  const getHoursMinutes = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (record) {
      setInTime(getHoursMinutes(record.in_time));
      setOutTime(getHoursMinutes(record.out_time));
    } else {
      setInTime('09:00');
      setOutTime('');
    }
  }, [record, isEditingTimes]);

  const handleSaveTimes = (e) => {
    e.preventDefault();
    if (!inTime) {
      alert('Check-in time is required.');
      return;
    }
    onUpdateTimes(staffMember.id, inTime, outTime || null);
    setIsEditingTimes(false);
  };

  return (
    <div className="staff-row-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', gap: '1rem', flexWrap: 'wrap' }}>
      <div className="staff-card-info">
        <div className="staff-card-name" style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{staffMember.name}</div>
        <div className="staff-card-meta" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {staffMember.phone && <span style={{ marginRight: '0.75rem' }}>Phone: {staffMember.phone}</span>}
          <span>Shift expected in: {staffMember.expected_in_time ? staffMember.expected_in_time.slice(0, 5) : '09:00'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
        {/* Status Badge */}
        {isMarked ? (
          isPresent ? (
            <span className="badge badge-success">Present</span>
          ) : (
            <span className="badge badge-danger">Absent</span>
          )
        ) : (
          <span className="badge badge-warning">Not Marked</span>
        )}

        {/* Time display or inline editing inputs */}
        {isPresent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isEditingTimes ? (
              <form onSubmit={handleSaveTimes} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In:</span>
                  <input
                    type="time"
                    className="time-input"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--card-border)', color: '#fff', padding: '0.2rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem' }}
                    value={inTime}
                    required
                    onChange={(e) => setInTime(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Out:</span>
                  <input
                    type="time"
                    className="time-input"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--card-border)', color: '#fff', padding: '0.2rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem' }}
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-success btn-sm" style={{ padding: '0.25rem 0.4rem', minWidth: 'auto' }} title="Save times">
                  <Check size={12} />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.4rem', minWidth: 'auto' }} onClick={() => setIsEditingTimes(false)}>
                  <X size={12} />
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span>In: <strong>{inTime || '--:--'}</strong></span>
                <span>Out: <strong>{outTime || '--:--'}</strong></span>
                <button 
                  onClick={() => setIsEditingTimes(true)} 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '0.25rem', minWidth: 'auto' }} 
                  title="Edit times manually"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2">
          {!isMarked && (
            <>
              <button onClick={() => onMarkPresent(staffMember.id, staffMember.expected_in_time)} className="btn btn-success btn-sm flex items-center gap-1">
                <UserCheck size={14} /> Present
              </button>
              <button onClick={() => onMarkAbsent(staffMember.id)} className="btn btn-danger btn-sm flex items-center gap-1">
                <UserX size={14} /> Absent
              </button>
            </>
          )}

          {isMarked && (
            <>
              {isPresent && !record.out_time && !isEditingTimes && (
                <button onClick={() => onCheckOut(staffMember.id)} className="btn btn-warning btn-sm flex items-center gap-1">
                  <Clock size={14} /> Check Out
                </button>
              )}

              {/* Explicit toggle actions for Owner */}
              {isPresent ? (
                <button onClick={() => onMarkAbsent(staffMember.id)} className="btn btn-secondary btn-sm" title="Switch to Absent">
                  Switch to Absent
                </button>
              ) : (
                <button onClick={() => onMarkPresent(staffMember.id, staffMember.expected_in_time)} className="btn btn-secondary btn-sm" title="Switch to Present">
                  Switch to Present
                </button>
              )}

              <button onClick={() => onReset(staffMember.id)} className="btn btn-secondary btn-sm" title="Reset/Clear attendance" style={{ padding: '0.35rem' }}>
                <RefreshCw size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OwnerDashboard({ userProfile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Routing sync
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'expenses') {
      window.history.pushState({}, '', '/expenses');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    if (window.location.pathname === '/expenses') {
      setActiveTab('expenses');
    }
    const handlePopState = () => {
      if (window.location.pathname === '/expenses') {
        setActiveTab('expenses');
      } else {
        setActiveTab('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // New User Registration Form State
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('manager');
  const [newUserLoading, setNewUserLoading] = useState(false);

  // Local helper for local date
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getLocalDateString();

  // Shared Data States
  const [staff, setStaff] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState({});
  const [profiles, setProfiles] = useState([]); // signed up users

  // Attendance Tab specific states
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(todayStr);
  const [attendanceForSelectedDate, setAttendanceForSelectedDate] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');

  const loadAttendanceForSelectedDate = useCallback(async () => {
    if (!selectedAttendanceDate) return;
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, updater:profiles(full_name, email)')
        .eq('date', selectedAttendanceDate);
      if (error) throw error;
      const attMap = {};
      data.forEach(item => {
        attMap[item.staff_id] = item;
      });
      setAttendanceForSelectedDate(attMap);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load attendance for the selected date.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedAttendanceDate]);

  useEffect(() => {
    loadAttendanceForSelectedDate();
  }, [loadAttendanceForSelectedDate]);

  const getTimestampForDate = (dateStr, isCheckOut = false, staffExpectedIn = '09:00') => {
    const now = new Date();
    if (dateStr === todayStr) {
      return now.toISOString();
    }
    if (isCheckOut) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      return new Date(`${dateStr}T${hh}:${mm}:${ss}`).toISOString();
    } else {
      const timeStr = staffExpectedIn ? staffExpectedIn.slice(0, 5) : '09:00';
      return new Date(`${dateStr}T${timeStr}:00`).toISOString();
    }
  };

  const ownerMarkPresent = async (staffId, expectedInTime) => {
    setErrorMsg('');
    setSuccessMsg('');
    const inTimeIso = getTimestampForDate(selectedAttendanceDate, false, expectedInTime);
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          staff_id: staffId,
          date: selectedAttendanceDate,
          status: 'present',
          in_time: inTimeIso,
          out_time: null,
          updated_by: userProfile.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'staff_id,date'
        });
      if (error) throw error;
      setSuccessMsg('Staff member marked as Present.');
      loadAttendanceForSelectedDate();
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error marking present.');
    }
  };

  const ownerMarkAbsent = async (staffId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          staff_id: staffId,
          date: selectedAttendanceDate,
          status: 'absent',
          in_time: null,
          out_time: null,
          updated_by: userProfile.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'staff_id,date'
        });
      if (error) throw error;
      setSuccessMsg('Staff member marked as Absent.');
      loadAttendanceForSelectedDate();
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error marking absent.');
    }
  };

  const ownerCheckOut = async (staffId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const outTimeIso = getTimestampForDate(selectedAttendanceDate, true);
    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          out_time: outTimeIso,
          updated_by: userProfile.id,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', staffId)
        .eq('date', selectedAttendanceDate);
      if (error) throw error;
      setSuccessMsg('Staff member checked out successfully.');
      loadAttendanceForSelectedDate();
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error checking out.');
    }
  };

  const ownerResetAttendance = async (staffId) => {
    if (!window.confirm('Are you sure you want to reset attendance for this staff member on this date?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('staff_id', staffId)
        .eq('date', selectedAttendanceDate);
      if (error) throw error;
      setSuccessMsg('Attendance record reset successfully.');
      loadAttendanceForSelectedDate();
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error resetting attendance.');
    }
  };

  const ownerUpdateTimes = async (staffId, newInTime, newOutTime) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const finalIn = new Date(`${selectedAttendanceDate}T${newInTime}:00`).toISOString();
      const finalOut = newOutTime ? new Date(`${selectedAttendanceDate}T${newOutTime}:00`).toISOString() : null;

      const { error } = await supabase
        .from('attendance')
        .update({
          in_time: finalIn,
          out_time: finalOut,
          updated_by: userProfile.id,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', staffId)
        .eq('date', selectedAttendanceDate);

      if (error) throw error;
      setSuccessMsg('Attendance times updated successfully.');
      loadAttendanceForSelectedDate();
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error updating times.');
    }
  };

  // Load baseline dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });
      if (staffError) throw staffError;
      setStaff(staffData);

      // 2. Fetch today's attendance and join the profiles (updater) info
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*, updater:profiles(full_name, email)')
        .eq('date', todayStr);
      if (attError) throw attError;

      const attMap = {};
      attData.forEach(item => {
        attMap[item.staff_id] = item;
      });
      setAttendanceToday(attMap);

      // 3. Fetch user profiles (access control)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });
      if (profilesError) throw profilesError;
      setProfiles(profilesData);

    } catch (error) {
      console.error(error);
      setErrorMsg('Error loading dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Helper: check if check-in was late
  const checkIsLate = (inTimeStr, expectedTimeStr) => {
    if (!inTimeStr || !expectedTimeStr) return false;
    const inDate = new Date(inTimeStr);
    const inHour = inDate.getHours();
    const inMinute = inDate.getMinutes();
    const [expHour, expMinute] = expectedTimeStr.split(':').map(Number);
    
    if (inHour > expHour) return true;
    if (inHour === expHour && inMinute > expMinute) return true;
    return false;
  };

  // Helper: calculate working hours
  const calculateHours = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;
    const diffMs = new Date(outTime) - new Date(inTime);
    const hours = diffMs / (1000 * 60 * 60);
    return hours > 0 ? hours : 0;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* ==========================================================
     TAB 1: OVERVIEW DASHBOARD
     ========================================================== */
  const activeStaff = staff.filter(s => s.status === 'active');
  const totalStaffCount = activeStaff.length;
  let presentCount = 0;
  let absentCount = 0;
  let pendingCount = 0;
  let lateCount = 0;

  activeStaff.forEach(s => {
    const record = attendanceToday[s.id];
    if (!record) {
      pendingCount++;
    } else if (record.status === 'present') {
      presentCount++;
      if (checkIsLate(record.in_time, s.expected_in_time)) {
        lateCount++;
      }
    } else if (record.status === 'absent') {
      absentCount++;
    }
  });

  /* ==========================================================
     TAB 2: STAFF DIRECTORY MANAGEMENT
     ========================================================== */
  const [staffForm, setStaffForm] = useState({ id: null, name: '', phone: '', expected_in_time: '09:00', expected_out_time: '17:00', status: 'active', base_salary: '0', pay_cycle: 'End of month' });
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const handleStaffFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const formattedExpectedTime = staffForm.expected_in_time.length === 5 ? `${staffForm.expected_in_time}:00` : staffForm.expected_in_time;
    const formattedOutTime = staffForm.expected_out_time.length === 5 ? `${staffForm.expected_out_time}:00` : staffForm.expected_out_time;
    const salaryNum = parseFloat(staffForm.base_salary) || 0;

    try {
      if (isEditingStaff) {
        // Edit existing staff
        const { error } = await supabase
          .from('staff')
          .update({
            name: staffForm.name,
            phone: staffForm.phone || null,
            expected_in_time: formattedExpectedTime,
            expected_out_time: formattedOutTime,
            status: staffForm.status,
            base_salary: salaryNum,
            pay_cycle: staffForm.pay_cycle
          })
          .eq('id', staffForm.id);

        if (error) throw error;
        setSuccessMsg(`Staff "${staffForm.name}" updated successfully.`);
      } else {
        // Create new staff
        const { error } = await supabase
          .from('staff')
          .insert({
            name: staffForm.name,
            phone: staffForm.phone || null,
            expected_in_time: formattedExpectedTime,
            expected_out_time: formattedOutTime,
            status: 'active',
            base_salary: salaryNum,
            pay_cycle: staffForm.pay_cycle
          });

        if (error) throw error;
        setSuccessMsg(`Staff "${staffForm.name}" added successfully.`);
      }

      setStaffForm({ id: null, name: '', phone: '', expected_in_time: '09:00', expected_out_time: '17:00', status: 'active', base_salary: '0', pay_cycle: 'End of month' });
      setIsEditingStaff(false);
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error processing staff details.');
    }
  };

  const handleEditStaffClick = (s) => {
    setIsEditingStaff(true);
    setStaffForm({
      id: s.id,
      name: s.name,
      phone: s.phone || '',
      expected_in_time: s.expected_in_time ? s.expected_in_time.slice(0, 5) : '09:00',
      expected_out_time: s.expected_out_time ? s.expected_out_time.slice(0, 5) : '17:00',
      status: s.status,
      base_salary: (s.base_salary || 0).toString(),
      pay_cycle: s.pay_cycle || 'End of month'
    });
  };

  const handleDeleteStaffClick = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete all their historical attendance records.`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg(`Staff member deleted successfully.`);
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error deleting staff.');
    }
  };

  const filteredStaffList = staff.filter(s => 
    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  /* ==========================================================
     TAB 3: ATTENDANCE CORRECTION
     ========================================================== */
  const [correctDate, setCorrectDate] = useState(todayStr);
  const [correctStaffId, setCorrectStaffId] = useState('');
  const [correctStatus, setCorrectStatus] = useState('present');
  const [correctInTime, setCorrectInTime] = useState('09:00');
  const [correctOutTime, setCorrectOutTime] = useState('17:00');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctStaffId) {
      alert('Please select a staff member.');
      return;
    }
    setCorrectionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalIn = null;
      let finalOut = null;

      if (correctStatus === 'present') {
        // Construct full ISO timestamps for the selected date
        finalIn = new Date(`${correctDate}T${correctInTime}:00`).toISOString();
        finalOut = correctOutTime ? new Date(`${correctDate}T${correctOutTime}:00`).toISOString() : null;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert({
          staff_id: correctStaffId,
          date: correctDate,
          status: correctStatus,
          in_time: finalIn,
          out_time: finalOut,
          updated_by: userProfile.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'staff_id,date'
        });

      if (error) throw error;
      setSuccessMsg('Attendance record corrected/updated successfully.');
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error updating attendance.');
    } finally {
      setCorrectionLoading(false);
    }
  };

  // Helper to load correction detail when selector changes
  useEffect(() => {
    if (correctStaffId && correctDate) {
      const fetchCurrentRecord = async () => {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('staff_id', correctStaffId)
          .eq('date', correctDate)
          .maybeSingle();
        
        if (!error && data) {
          setCorrectStatus(data.status);
          if (data.in_time) {
            const inDate = new Date(data.in_time);
            setCorrectInTime(`${String(inDate.getHours()).padStart(2, '0')}:${String(inDate.getMinutes()).padStart(2, '0')}`);
          } else {
            setCorrectInTime('09:00');
          }
          if (data.out_time) {
            const outDate = new Date(data.out_time);
            setCorrectOutTime(`${String(outDate.getHours()).padStart(2, '0')}:${String(outDate.getMinutes()).padStart(2, '0')}`);
          } else {
            setCorrectOutTime('17:00');
          }
        } else {
          // Defaults if no record
          setCorrectStatus('present');
          setCorrectInTime('09:00');
          setCorrectOutTime('17:00');
        }
      };
      fetchCurrentRecord();
    }
  }, [correctStaffId, correctDate]);

  /* ==========================================================
     TAB 4: MONTHLY REPORTS & CSV EXPORT
     ========================================================== */
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  });
  const [reportStaffId, setReportStaffId] = useState('all');
  const [reportData, setReportData] = useState([]);
  const [reportDetails, setReportDetails] = useState([]); // selected staff's detail logs
  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = useCallback(async () => {
    if (!reportMonth) return;
    setReportLoading(true);
    try {
      const [year, month] = reportMonth.split('-').map(Number);
      const startOfMonth = `${reportMonth}-01`;
      // Find end of month
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${reportMonth}-${String(lastDay).padStart(2, '0')}`;

      // Limit to today if selected month is current month
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
      const endRangeStr = isCurrentMonth ? todayStr : endOfMonth;

      // 1. Fetch attendance records for that range and join the profiles (updater) info
      const { data: attRecords, error: attError } = await supabase
        .from('attendance')
        .select(`
          *,
          staff (name, expected_in_time, joined_date),
          updater:profiles(full_name, email)
        `)
        .gte('date', startOfMonth)
        .lte('date', endRangeStr);

      if (attError) throw attError;

      // Map records by staff_id & date
      const recordMap = {};
      attRecords.forEach(rec => {
        if (!recordMap[rec.staff_id]) recordMap[rec.staff_id] = {};
        recordMap[rec.staff_id][rec.date] = rec;
      });

      // Filter staff relevant for the report
      const staffList = reportStaffId === 'all' 
        ? staff.filter(s => s.status === 'active') // active staff reports
        : staff.filter(s => s.id === reportStaffId);

      // Generate date array from 1st to endRangeStr
      const dateArray = [];
      let current = new Date(startOfMonth);
      const endRangeDate = new Date(endRangeStr);
      while (current <= endRangeDate) {
        dateArray.push(new Date(current).toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // 2. Process records per staff member
      const summaryList = [];
      const detailLogs = [];

      staffList.forEach(s => {
        let pDays = 0;
        let aDays = 0;
        let hrsWorked = 0;
        let lArrivals = 0;

        dateArray.forEach(dStr => {
          // Check if staff had joined yet
          const joinedStr = s.joined_date || startOfMonth;
          if (dStr < joinedStr) return; // skip days before joining

          const rec = recordMap[s.id]?.[dStr];
          
          let rowStatus = 'absent';
          let rowIn = null;
          let rowOut = null;
          let rowHours = 0;
          let rowLate = false;
          let rowUpdatedBy = '--';

          if (rec) {
            rowStatus = rec.status;
            rowUpdatedBy = rec.updater ? (rec.updater.full_name || rec.updater.email) : '--';
            if (rec.status === 'present') {
              pDays++;
              rowIn = rec.in_time;
              rowOut = rec.out_time;
              rowHours = calculateHours(rec.in_time, rec.out_time);
              hrsWorked += rowHours;
              
              if (checkIsLate(rec.in_time, s.expected_in_time)) {
                lArrivals++;
                rowLate = true;
              }
            } else {
              aDays++;
            }
          } else {
            // Missing record acts as absent
            aDays++;
          }

          detailLogs.push({
            staffId: s.id,
            staffName: s.name,
            date: dStr,
            status: rowStatus,
            inTime: rowIn,
            outTime: rowOut,
            hours: rowHours,
            isLate: rowLate,
            updatedBy: rowUpdatedBy
          });
        });

        summaryList.push({
          staffId: s.id,
          name: s.name,
          totalDays: pDays + aDays,
          present: pDays,
          absent: aDays,
          hours: hrsWorked,
          late: lArrivals
        });
      });

      setReportData(summaryList);
      setReportDetails(detailLogs);
    } catch (error) {
      console.error(error);
      setErrorMsg('Error generating reports.');
    } finally {
      setReportLoading(false);
    }
  }, [reportMonth, reportStaffId, todayStr, staff]);

  useEffect(() => {
    if (activeTab === 'reports') {
      generateReport();
    }
  }, [activeTab, reportMonth, reportStaffId, generateReport]);

  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Staff Name,Total Shift Days,Present Days,Absent Days,Total Working Hours,Late Arrivals\n';

    reportData.forEach(row => {
      csvContent += `"${row.name}",${row.totalDays},${row.present},${row.absent},${row.hours.toFixed(1)},${row.late}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ==========================================================
     TAB 5: ROLE / ACCESS MANAGEMENT
     ========================================================== */
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setNewUserLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (newUserPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setNewUserLoading(false);
      return;
    }

    let targetEmail = newUserUsername.trim().toLowerCase();
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@shop.com`;
    }

    try {
      const secondaryClient = createSecondaryClient();
      const { data, error } = await secondaryClient.auth.signUp({
        email: targetEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserFullName
          }
        }
      });

      if (error) throw error;

      if (data && data.user) {
        // Update user role from the default "pending" to the selected role
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: newUserRole, full_name: newUserFullName })
          .eq('id', data.user.id);

        if (roleError) throw roleError;

        setSuccessMsg(`User account "${newUserUsername}" registered successfully as ${newUserRole}!`);
        setNewUserFullName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserRole('manager');
        loadDashboardData();
      } else {
        throw new Error('Registration failed to return user information.');
      }
    } catch (error) {
      setErrorMsg(error.message || 'Error creating user account.');
    } finally {
      setNewUserLoading(false);
    }
  };

  const handleRoleChange = async (profileId, newRole) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);

      if (error) throw error;
      setSuccessMsg('User role updated successfully.');
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error updating user role.');
    }
  };

  const handleProfileDelete = async (profileId) => {
    if (profileId === userProfile.id) {
      alert('You cannot delete your own account!');
      return;
    }
    if (!window.confirm('Are you sure you want to revoke database access for this profile?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);
      
      if (error) throw error;
      setSuccessMsg('Access revoked successfully.');
      loadDashboardData();
    } catch (error) {
      setErrorMsg(error.message || 'Error revoking access.');
    }
  };

  return (
    <div className="app-container">
      <div className="dashboard-layout">
        
        {/* Navigation Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Store size={24} />
            <span className="logo-text" style={{ fontSize: '1.05rem' }}>V MART Attendance</span>
          </div>

          <div className="sidebar-user">
            <span className="user-name">{userProfile.full_name || userProfile.email}</span>
            <span className="user-role">Owner</span>
          </div>

          <nav className="sidebar-nav">
            <button onClick={() => handleTabChange('overview')} className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}>
              <Store size={18} /> Overview
            </button>
            <button onClick={() => handleTabChange('attendance')} className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}>
              <Clock size={18} /> Attendance
            </button>
            <button onClick={() => handleTabChange('staff')} className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`}>
              <Users size={18} /> Staff Directory
            </button>
            <button onClick={() => handleTabChange('expenses')} className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}>
              <Wallet size={18} /> Expenses & Salaries
            </button>
            <button onClick={() => handleTabChange('correction')} className={`nav-item ${activeTab === 'correction' ? 'active' : ''}`}>
              <Edit2 size={18} /> Corrections
            </button>
            <button onClick={() => handleTabChange('reports')} className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}>
              <FileText size={18} /> Reports
            </button>
            <button onClick={() => handleTabChange('access')} className={`nav-item ${activeTab === 'access' ? 'active' : ''}`}>
              <Shield size={18} /> User Access
            </button>
          </nav>
 
           <div className="sidebar-footer">
             <button onClick={handleLogout} className="btn-logout">
               <LogOut size={18} /> Sign Out
             </button>
           </div>
         </aside>
 
         {/* Dashboard Main Workspace */}
         <main className="main-content">
           
           <div className="header-container">
             <div className="page-title">
               {activeTab === 'overview' && (
                 <>
                   <h1>Overview Dashboard</h1>
                   <p>Shop metrics summary for today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </>
               )}
               {activeTab === 'attendance' && (
                 <>
                   <h1>Attendance Management</h1>
                   <p>Mark, edit and view attendance logs for any past or current date</p>
                 </>
               )}
               {activeTab === 'staff' && (
                 <>
                   <h1>Staff Directory</h1>
                   <p>Manage shop personnel details and expected shifts</p>
                 </>
               )}
               {activeTab === 'expenses' && (
                 <>
                   <h1>Expenses & Salaries</h1>
                   <p>Manage shop expenses, utility bills, and staff payroll</p>
                 </>
               )}
               {activeTab === 'correction' && (
                 <>
                   <h1>Attendance Corrections</h1>
                   <p>Manually adjust check-in/out logs or status for any day</p>
                 </>
               )}
               {activeTab === 'reports' && (
                 <>
                   <h1>Monthly Analytics & Reports</h1>
                   <p>Review working hours, attendance percentages, and late arrivals</p>
                 </>
               )}
               {activeTab === 'access' && (
                 <>
                   <h1>Access Control Settings</h1>
                   <p>Manage and authorize manager/owner user accounts</p>
                 </>
               )}
            </div>

            <div className="header-actions">
              <button onClick={loadDashboardData} className="btn btn-secondary" disabled={loading}>
                <RefreshCw size={16} className={loading ? 'spinner' : ''} />
                Reload
              </button>
            </div>
          </div>

          {/* Alert Notification Banners */}
          {errorMsg && (
            <div className="alert-banner danger">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
              <button className="flex" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setErrorMsg('')}>
                <X size={14} />
              </button>
            </div>
          )}
          {successMsg && (
            <div className="alert-banner success">
              <Check size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
              <button className="flex" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccessMsg('')}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB CONTENTS */}
          
          {/* 0. ATTENDANCE MANAGEMENT TAB */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Date Selection Panel */}
              <div className="glass-card flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Log Date:</span>
                  <input
                    type="date"
                    className="input-control"
                    style={{ width: '180px', padding: '0.5rem' }}
                    value={selectedAttendanceDate}
                    max={todayStr}
                    onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedAttendanceDate(todayStr)} 
                      className={`btn btn-sm ${selectedAttendanceDate === todayStr ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setSelectedAttendanceDate(getLocalDateString(-1))} 
                      className={`btn btn-sm ${selectedAttendanceDate === getLocalDateString(-1) ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <span className="badge badge-info" style={{ textTransform: 'none' }}>
                    Viewing: {selectedAttendanceDate === todayStr ? "Today's Live Logs" : `Historical Logs (${selectedAttendanceDate})`}
                  </span>
                </div>
              </div>

              {/* Attendance marking card */}
              <div className="glass-card">
                <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <h2>Personnel Attendance Registry</h2>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', md: 'auto', maxWidth: '500px' }}>
                    <div className="search-input-wrapper" style={{ flexGrow: 1, margin: 0 }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search personnel by name..."
                        className="input-control"
                        style={{ paddingLeft: '2.2rem', padding: '0.5rem 0.5rem 0.5rem 2.2rem', fontSize: '0.85rem' }}
                        value={attendanceSearchQuery}
                        onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      />
                    </div>

                    <select
                      className="input-control"
                      style={{ width: '150px', padding: '0.5rem', fontSize: '0.85rem' }}
                      value={attendanceStatusFilter}
                      onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Not Marked</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>

                {attendanceLoading ? (
                  <div className="spinner-container" style={{ padding: '3rem 0' }}>
                    <div className="spinner"></div>
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center" style={{ padding: '3rem 0', color: 'var(--text-secondary)' }}>
                    No personnel defined. Add staff members in the "Staff Directory" tab first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {staff
                      .filter(s => {
                        const matchesSearch = s.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase());
                        const rec = attendanceForSelectedDate[s.id];
                        const status = rec ? rec.status : 'pending';
                        const matchesFilter = attendanceStatusFilter === 'all' || status === attendanceStatusFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map(s => {
                        const rec = attendanceForSelectedDate[s.id];
                        return (
                          <OwnerStaffAttendanceCard
                            key={s.id}
                            staffMember={s}
                            record={rec}
                            onMarkPresent={ownerMarkPresent}
                            onMarkAbsent={ownerMarkAbsent}
                            onCheckOut={ownerCheckOut}
                            onReset={ownerResetAttendance}
                            onUpdateTimes={ownerUpdateTimes}
                          />
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 0. EXPENSES & SALARIES TAB */}
          {activeTab === 'expenses' && (
            <Expenses userProfile={userProfile} />
          )}

          {/* 1. OVERVIEW SCREEN */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="dashboard-grid">
                <div className="glass-card stat-card">
                  <div className="stat-icon primary">
                    <Users size={22} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-value">{totalStaffCount}</span>
                    <span className="stat-label">Active Staff</span>
                  </div>
                </div>

                <div className="glass-card stat-card">
                  <div className="stat-icon success">
                    <UserCheck size={22} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-value">{presentCount}</span>
                    <span className="stat-label">Present Today</span>
                  </div>
                </div>

                <div className="glass-card stat-card">
                  <div className="stat-icon danger">
                    <UserX size={22} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-value">{absentCount}</span>
                    <span className="stat-label">Absent Today</span>
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

                <div className="glass-card stat-card">
                  <div className="stat-icon danger" style={{ color: 'var(--warning-color)', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                    <Clock size={22} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-value">{lateCount}</span>
                    <span className="stat-label">Late Arrivals</span>
                  </div>
                </div>
              </div>

              {/* Today's Log Card */}
              <div className="glass-card">
                <h2 className="mb-4">Today's Shift Log</h2>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Status</th>
                        <th>In Time</th>
                        <th>Out Time</th>
                        <th>Hrs Worked</th>
                        <th>Arrival Status</th>
                        <th>Marked/Updated By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStaff.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center" style={{ padding: '2rem' }}>No staff members defined. Go to "Staff Directory" tab to add staff.</td>
                        </tr>
                      ) : (
                        activeStaff.map(s => {
                          const record = attendanceToday[s.id];
                          const isMarked = !!record;
                          const isPresent = record?.status === 'present';
                          const isLate = isPresent && checkIsLate(record.in_time, s.expected_in_time);
                          const hours = isPresent ? calculateHours(record.in_time, record.out_time) : 0;
                          const updaterName = record?.updater ? (record.updater.full_name || record.updater.email) : '--';
                          
                          return (
                            <tr key={s.id}>
                              <td><strong style={{ color: '#fff' }}>{s.name}</strong></td>
                              <td>
                                {isMarked ? (
                                  <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                                    {record.status}
                                  </span>
                                ) : (
                                  <span className="badge badge-warning">Not Marked</span>
                                )}
                              </td>
                              <td>{isPresent ? formatTime(record.in_time) : '--:--'}</td>
                              <td>{isPresent ? formatTime(record.out_time) : '--:--'}</td>
                              <td>{isPresent ? `${hours.toFixed(1)} hrs` : '0.0 hrs'}</td>
                              <td>
                                {isPresent ? (
                                  isLate ? (
                                    <span className="badge badge-warning">Late Arrival</span>
                                  ) : (
                                    <span className="badge badge-success">On Time</span>
                                  )
                                ) : (
                                  '--'
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '0.85rem' }}>{updaterName}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. STAFF MANAGEMENT TAB */}
          {activeTab === 'staff' && (
            <div className="dashboard-split">
              {/* Directory table */}
              <div className="glass-card">
                <div className="flex justify-between items-center mb-4">
                  <h2>Staff Personnel</h2>
                  <div className="search-input-wrapper" style={{ maxWidth: '280px', margin: 0 }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search personnel..."
                      className="input-control"
                      style={{ paddingLeft: '2.2rem', padding: '0.5rem 0.5rem 0.5rem 2.2rem', fontSize: '0.85rem' }}
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Shift Schedule</th>
                        <th>Base Salary</th>
                        <th>Salary Cycle</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaffList.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center" style={{ padding: '2rem' }}>No staff members found.</td>
                        </tr>
                      ) : (
                        filteredStaffList.map(s => (
                          <tr key={s.id}>
                            <td><strong style={{ color: '#fff' }}>{s.name}</strong></td>
                            <td>{s.phone || '--'}</td>
                            <td>{s.expected_in_time ? s.expected_in_time.slice(0, 5) : '09:00'} - {s.expected_out_time ? s.expected_out_time.slice(0, 5) : '17:00'}</td>
                            <td><strong style={{ color: 'var(--success-color)' }}>₹{s.base_salary || 0}</strong></td>
                            <td><span style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>{s.pay_cycle || 'End of month'}</span></td>
                            <td>{s.joined_date || '--'}</td>
                            <td>
                              <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                                {s.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button onClick={() => handleEditStaffClick(s)} className="btn btn-secondary btn-sm" title="Edit details" style={{ padding: '0.4rem' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteStaffClick(s.id, s.name)} className="btn btn-danger btn-sm" title="Delete staff" style={{ padding: '0.4rem' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form to Add/Edit Staff */}
              <div className="glass-card">
                <h2>{isEditingStaff ? 'Edit Staff Details' : 'Add New Staff'}</h2>
                <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {isEditingStaff ? 'Modify personnel details and shift limits.' : 'Register a new staff member to track their daily hours.'}
                </p>

                <form onSubmit={handleStaffFormSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Green"
                      className="input-control"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 555-0199"
                      className="input-control"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Shift Start (In-Time)</label>
                      <input
                        type="time"
                        required
                        className="input-control"
                        value={staffForm.expected_in_time}
                        onChange={(e) => setStaffForm({ ...staffForm, expected_in_time: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Shift End (Out-Time)</label>
                      <input
                        type="time"
                        required
                        className="input-control"
                        value={staffForm.expected_out_time}
                        onChange={(e) => setStaffForm({ ...staffForm, expected_out_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Base Monthly Salary (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 15000"
                      className="input-control"
                      value={staffForm.base_salary}
                      onChange={(e) => setStaffForm({ ...staffForm, base_salary: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salary Cycle / Pay Date</label>
                    <select
                      className="input-control"
                      value={staffForm.pay_cycle}
                      onChange={(e) => setStaffForm({ ...staffForm, pay_cycle: e.target.value })}
                      required
                    >
                      <option value="1st of month">1st of month</option>
                      {Array.from({ length: 30 }, (_, i) => {
                        const day = i + 2;
                        let suffix = 'th';
                        if (day === 2) suffix = 'nd';
                        else if (day === 3) suffix = 'rd';
                        else if (day === 21) suffix = 'st';
                        else if (day === 22) suffix = 'nd';
                        else if (day === 23) suffix = 'rd';
                        else if (day === 31) suffix = 'st';
                        const val = `${day}${suffix}`;
                        return <option key={val} value={val}>{val}</option>;
                      })}
                      <option value="End of month">End of month</option>
                    </select>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Daily Wage Equivalent: ₹ {((parseFloat(staffForm.base_salary) || 0) / 30).toFixed(2)} (estimated based on 30 days)
                    </small>
                  </div>

                  {isEditingStaff && (
                    <div className="form-group">
                      <label className="form-label">Employment Status</label>
                      <select
                        className="input-control"
                        value={staffForm.status}
                        onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 mt-6">
                    <button type="submit" className="btn btn-primary flex-grow">
                      <Save size={16} />
                      {isEditingStaff ? 'Save Changes' : 'Add Member'}
                    </button>
                    {isEditingStaff && (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsEditingStaff(false);
                          setStaffForm({ id: null, name: '', phone: '', expected_in_time: '09:00', status: 'active', base_salary: '0', pay_cycle: 'End of month' });
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. ATTENDANCE CORRECTION TAB */}
          {activeTab === 'correction' && (
            <div className="dashboard-split equal">
              <div className="glass-card">
                <h2>Attendance Adjustment Form</h2>
                <p className="mb-6" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Adjust, correct or manually insert attendance files for any worker on past dates.
                </p>

                <form onSubmit={handleCorrectionSubmit}>
                  <div className="form-group">
                    <label className="form-label">Target Log Date</label>
                    <input
                      type="date"
                      required
                      max={todayStr}
                      className="input-control"
                      value={correctDate}
                      onChange={(e) => setCorrectDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Staff Member</label>
                    <select
                      required
                      className="input-control"
                      value={correctStaffId}
                      onChange={(e) => setCorrectStaffId(e.target.value)}
                    >
                      <option value="">-- Choose staff member --</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shift Status</label>
                    <div className="flex gap-3" style={{ margin: '0.5rem 0' }}>
                      <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="correctStatus"
                          value="present"
                          checked={correctStatus === 'present'}
                          onChange={() => setCorrectStatus('present')}
                        />
                        <span>Present</span>
                      </label>
                      <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="correctStatus"
                          value="absent"
                          checked={correctStatus === 'absent'}
                          onChange={() => setCorrectStatus('absent')}
                        />
                        <span>Absent</span>
                      </label>
                    </div>
                  </div>

                  {correctStatus === 'present' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Check In Time</label>
                        <input
                          type="time"
                          required
                          className="input-control"
                          value={correctInTime}
                          onChange={(e) => setCorrectInTime(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Check Out Time</label>
                        <input
                          type="time"
                          className="input-control"
                          value={correctOutTime}
                          onChange={(e) => setCorrectOutTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-block mt-4" disabled={correctionLoading}>
                    {correctionLoading ? 'Saving...' : 'Save Attendance Log'}
                  </button>
                </form>
              </div>

              {/* Informative Guidance */}
              <div className="glass-card flex" style={{ flexDirection: 'column', justifyContent: 'center', gap: '1rem', borderStyle: 'dashed' }}>
                <div className="auth-logo" style={{ alignSelf: 'center', marginBottom: '0.5rem' }}>
                  <Shield size={24} />
                </div>
                <h3 className="text-center">Audit & Security Notice</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.6' }}>
                  All corrections made through this screen register the active owner identity 
                  (<strong>{userProfile.full_name}</strong>) as the modifier in the system logs.
                </p>
                <div className="alert-banner warning" style={{ margin: '1rem 0 0 0', fontSize: '0.85rem' }}>
                  <span>Corrected hours immediately update reports, CSV exports, and manager dashboard files.</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. REPORTS TAB */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card">
                <h2>Filter Analytics Report</h2>
                <div className="search-filter-bar mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', width: '100%' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Month</label>
                    <input
                      type="month"
                      className="input-control"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Filter Staff Member</label>
                    <select
                      className="input-control"
                      value={reportStaffId}
                      onChange={(e) => setReportStaffId(e.target.value)}
                    >
                      <option value="all">All Active Staff</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ alignSelf: 'end', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={generateReport} className="btn btn-primary" style={{ padding: '0.75rem 1rem' }}>
                      Generate
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '0.75rem' }} title="Export CSV" disabled={reportData.length === 0}>
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly Stats Summary Table */}
              <div className="glass-card">
                <h2>Monthly Attendance Summary ({reportMonth})</h2>
                {reportLoading ? (
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                ) : reportData.length === 0 ? (
                  <div className="text-center" style={{ padding: '3rem 0', color: 'var(--text-muted)' }}>
                    No record data available for the chosen filters.
                  </div>
                ) : (
                  <>
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Staff Name</th>
                            <th>Shift Days</th>
                            <th>Present Days</th>
                            <th>Absent Days</th>
                            <th>Late Arrivals</th>
                            <th>Total Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map(row => (
                            <tr key={row.staffId}>
                              <td><strong style={{ color: '#fff' }}>{row.name}</strong></td>
                              <td>{row.totalDays} days</td>
                              <td>
                                <span className="badge badge-success">{row.present} Present</span>
                              </td>
                              <td>
                                <span className="badge badge-danger">{row.absent} Absent</span>
                              </td>
                              <td>
                                <span className={`badge ${row.late > 0 ? 'badge-warning' : 'badge-neutral'}`}>
                                  {row.late} Late
                                </span>
                              </td>
                              <td><strong style={{ color: '#fff' }}>{row.hours.toFixed(1)} hrs</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Daily Logs Breakout if specific staff selected */}
                    {reportStaffId !== 'all' && (
                      <div className="mt-6">
                        <h3 className="mb-3">Daily History Breakout</h3>
                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>In Time</th>
                                <th>Out Time</th>
                                <th>Working Hours</th>
                                <th>Arrival</th>
                                <th>Marked By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportDetails
                                .filter(d => d.staffId === reportStaffId)
                                .map(d => (
                                  <tr key={d.date}>
                                    <td>{d.date}</td>
                                    <td>
                                      <span className={`badge ${d.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                        {d.status}
                                      </span>
                                    </td>
                                    <td>{d.inTime ? formatTime(d.inTime) : '--'}</td>
                                    <td>{d.outTime ? formatTime(d.outTime) : '--'}</td>
                                    <td>{d.status === 'present' ? `${d.hours.toFixed(1)} hrs` : '0.0 hrs'}</td>
                                    <td>
                                      {d.status === 'present' ? (
                                        d.isLate ? (
                                          <span className="badge badge-warning">Late Arrival</span>
                                        ) : (
                                          <span className="badge badge-success">On Time</span>
                                        )
                                      ) : (
                                        '--'
                                      )}
                                    </td>
                                    <td>
                                      <span style={{ fontSize: '0.85rem' }}>{d.updatedBy}</span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 5. ACCESS CONTROL TAB */}
          {activeTab === 'access' && (
            <div className="dashboard-split">
              {/* Left Pane: Create Account */}
              <div className="glass-card">
                <h2>Register New User</h2>
                <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Only owners can add user accounts. Set their credentials and access level.
                </p>
                <form onSubmit={handleCreateUserSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monica Geller"
                      className="input-control"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. monica"
                      className="input-control"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Username used to log in. Will map to `{newUserUsername || 'username'}@shop.com` internally.
                    </small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      className="input-control"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Access Level</label>
                    <select
                      className="input-control"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="manager">Manager Access</option>
                      <option value="owner">Owner Access</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block mt-4" disabled={newUserLoading}>
                    {newUserLoading ? 'Registering...' : 'Register Account'}
                  </button>
                </form>
              </div>

              {/* Right Pane: Table List */}
              <div className="glass-card">
                <h2>User Authorization List</h2>
                <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Manage access and change authorization roles for active manager and owner accounts.
                </p>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Access Level</th>
                        <th>Update Permission</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(p => {
                        const displayUsername = p.email.split('@')[0];
                        return (
                          <tr key={p.id}>
                            <td><strong style={{ color: '#fff' }}>{p.full_name || '--'}</strong></td>
                            <td>{displayUsername}</td>
                            <td>
                              <span className={`badge ${p.role === 'owner' ? 'badge-info' : p.role === 'manager' ? 'badge-success' : 'badge-warning'}`}>
                                {p.role}
                              </span>
                            </td>
                            <td>
                              {p.id === userProfile.id ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current User</span>
                              ) : (
                                <select
                                  className="time-input"
                                  value={p.role}
                                  onChange={(e) => handleRoleChange(p.id, e.target.value)}
                                >
                                  <option value="pending">Pending Approval</option>
                                  <option value="manager">Manager Access</option>
                                  <option value="owner">Owner Access</option>
                                </select>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => handleProfileDelete(p.id)}
                                className="btn btn-danger btn-sm"
                                disabled={p.id === userProfile.id}
                                style={{ padding: '0.4rem' }}
                                title="Revoke database access"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
