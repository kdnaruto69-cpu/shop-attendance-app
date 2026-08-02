import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Edit2, Trash2, Wallet, FileText, Calendar, 
  Check, AlertCircle, X, DollarSign, RefreshCw, Plus, Shield
} from 'lucide-react';

const DEFAULT_CATEGORIES = ['Electricity Bill', 'Water Bill', 'Shop Rent', 'Salary Payout', 'Maintenance', 'Supplies', 'Other'];

export default function Expenses({ userProfile, setActiveTab }) {
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Checking if active user is owner
  const isOwner = userProfile?.role === 'owner';

  // Selected Month filter for History and Metrics
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    id: null,
    category: 'Electricity Bill',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    staff_id: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // Dynamic/custom category input
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Category management direct input (Owner panel)
  const [directCategoryInput, setDirectCategoryInput] = useState('');

  // Salary Tracker Input State: maps staff_id to { baseSalary, advance, bonus }
  const [salaryInputs, setSalaryInputs] = useState({});

  // Helper to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Load staff, expenses, categories, and attendance
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch active staff members for Salary tracker and profiling
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });
      if (staffError) throw staffError;
      setStaff(staffData);

      // Initialize salary inputs for each staff member if not set
      const initialSalaryInputs = {};
      staffData.forEach(s => {
        initialSalaryInputs[s.id] = { baseSalary: '', advance: '', bonus: '' };
      });
      setSalaryInputs(prev => ({ ...initialSalaryInputs, ...prev }));

      // Compute date range to query: from start of previous month to end of selected month
      // This ensures we capture cross-month cycles (e.g. 25th to 24th) and associated advances/attendance.
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const startQueryDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

      const lastDay = new Date(year, month, 0).getDate();
      const endQueryDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      // 2. Fetch expenses within range
      const { data: expenseData, error: expenseError } = await supabase
        .from('shop_expenses')
        .select('*')
        .gte('date', startQueryDate)
        .lte('date', endQueryDate)
        .order('date', { ascending: false });
      
      if (expenseError) throw expenseError;
      setExpenses(expenseData || []);

      // 3. Fetch custom and default categories
      const { data: catData, error: catError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      if (catError) throw catError;
      setCategories(catData || []);

      // 4. Fetch attendance records in query range
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startQueryDate)
        .lte('date', endQueryDate);
      if (attError) throw attError;
      setAttendance(attData || []);

    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to load expense, attendance, category, and salary data.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper to compute payroll details for a staff member within their pay cycle
  const getCycleInfo = (s) => {
    const payCycle = s.pay_cycle || 'End of month';
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDayOfSelectedMonth = new Date(year, month, 0).getDate();

    let start, end, totalDays;

    if (payCycle === '1st of month' || payCycle === 'End of month') {
      start = `${selectedMonth}-01`;
      end = `${selectedMonth}-${String(lastDayOfSelectedMonth).padStart(2, '0')}`;
      totalDays = lastDayOfSelectedMonth;
    } else {
      const dayNum = parseInt(payCycle); // 5, 10, 15, 25
      const prevDate = new Date(year, month - 2, dayNum);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      
      start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const endDay = dayNum - 1;
      end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      
      const dStart = new Date(start);
      const dEnd = new Date(end);
      totalDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Filter attendance for this staff member in this cycle
    const staffAtt = attendance.filter(a => a.staff_id === s.id && a.date >= start && a.date <= end);
    const daysPresent = staffAtt.filter(a => a.status === 'present').length;
    const daysAbsent = staffAtt.filter(a => a.status === 'absent').length;

    // Base Monthly Salary
    const monthlySalary = parseFloat(s.base_salary) || 0;

    // Calculated Base Payable = (Monthly Salary / Total Cycle Days) * Days Present
    const basePayable = totalDays > 0 ? (monthlySalary / totalDays) * daysPresent : 0;

    // Advances/loans linked to staff member in this cycle
    const staffExpenses = expenses.filter(e => e.staff_id === s.id && e.date >= start && e.date <= end);
    
    const totalAdvances = staffExpenses
      .filter(e => e.title.toLowerCase().includes('advance') || e.title.toLowerCase().includes('loan'))
      .reduce((sum, curr) => sum + parseFloat(curr.amount), 0);

    const totalBonuses = staffExpenses
      .filter(e => e.title.toLowerCase().includes('bonus'))
      .reduce((sum, curr) => sum + parseFloat(curr.amount), 0);

    // Final Net Payable Salary
    const netPayable = Math.max(0, basePayable + totalBonuses - totalAdvances);

    // Check if payroll payout already logged for this cycle
    const payoutRecord = staffExpenses.find(e => 
      e.category === 'Salary Payout' && 
      !e.title.toLowerCase().includes('advance') && 
      !e.title.toLowerCase().includes('loan') && 
      !e.title.toLowerCase().includes('bonus')
    );
    const isPaid = !!payoutRecord;

    return {
      start,
      end,
      totalDays,
      daysPresent,
      daysAbsent,
      monthlySalary,
      basePayable,
      totalAdvances,
      totalBonuses,
      netPayable,
      isPaid,
      paidAmount: payoutRecord ? parseFloat(payoutRecord.amount) : 0
    };
  };

  // Automated Logging of Payout
  const handleLogSalaryPayout = async (staffId, staffName, cycleInfo) => {
    if (cycleInfo.isPaid) return;
    if (cycleInfo.netPayable <= 0) {
      alert('Calculated net payable amount is ₹0.00. No payout to record.');
      return;
    }
    
    if (!window.confirm(`Log automated salary payout of ${formatCurrency(cycleInfo.netPayable)} for ${staffName} for the cycle ${cycleInfo.start} to ${cycleInfo.end}?`)) return;

    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('shop_expenses')
        .insert({
          category: 'Salary Payout',
          title: `Salary Payout - ${staffName}`,
          amount: cycleInfo.netPayable,
          date: new Date().toISOString().split('T')[0],
          notes: `Automated cycle payout (${cycleInfo.start} to ${cycleInfo.end}). Days present: ${cycleInfo.daysPresent}/${cycleInfo.totalDays}. Base Payable: ${formatCurrency(cycleInfo.basePayable)}. Advances deducted: ${formatCurrency(cycleInfo.totalAdvances)}.`,
          staff_id: staffId
        });

      if (error) throw error;
      setSuccessMsg(`Salary payout recorded for ${staffName} successfully.`);
      loadData();
    } catch (error) {
      setErrorMsg(error.message || `Failed to log payout for ${staffName}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Category Creation Directly (Owner console)
  const handleCreateCategoryDirectly = async (e) => {
    e.preventDefault();
    if (!directCategoryInput.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    const catName = directCategoryInput.trim();
    const exists = categories.some(c => c.name.toLowerCase() === catName.toLowerCase());
    
    if (exists) {
      setErrorMsg(`Category "${catName}" already exists.`);
      setActionLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert({ name: catName });

      if (error) throw error;
      setSuccessMsg(`Category "${catName}" created successfully.`);
      setDirectCategoryInput('');
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error creating category.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Category Deletion (Owner console)
  const handleDeleteCategory = async (catId, catName) => {
    if (DEFAULT_CATEGORIES.includes(catName)) {
      alert('Default categories cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the category "${catName}"? Existing expense records will NOT be deleted, but this category option will no longer be available.`)) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', catId);

      if (error) throw error;
      setSuccessMsg(`Category "${catName}" deleted successfully.`);
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error deleting category.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Expense Form Submit (Add/Edit)
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const amountNum = parseFloat(expenseForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setErrorMsg('Please enter a valid amount.');
      setActionLoading(false);
      return;
    }

    let finalCategory = expenseForm.category;

    try {
      // 1. If "+ Add New Category..." selected, insert the new category first
      if (expenseForm.category === '__NEW__') {
        const catNameFormatted = newCategoryName.trim();
        if (!catNameFormatted) {
          setErrorMsg('Please enter a valid category name.');
          setActionLoading(false);
          return;
        }

        // Check unique categories (case insensitive)
        const matched = categories.find(c => c.name.toLowerCase() === catNameFormatted.toLowerCase());
        if (matched) {
          finalCategory = matched.name;
        } else {
          // Attempt inserting the custom category in table
          const { error: catInsertError } = await supabase
            .from('expense_categories')
            .insert({ name: catNameFormatted });
          if (catInsertError) throw catInsertError;
          finalCategory = catNameFormatted;
        }
      }

      // 2. Perform Expense save (Insert or Update)
      if (isEditing && expenseForm.id) {
        // Update existing expense
        const { error } = await supabase
          .from('shop_expenses')
          .update({
            category: finalCategory,
            title: expenseForm.title.trim(),
            amount: amountNum,
            date: expenseForm.date,
            notes: expenseForm.notes.trim() || null,
            staff_id: expenseForm.staff_id || null
          })
          .eq('id', expenseForm.id);

        if (error) throw error;
        setSuccessMsg(`Expense "${expenseForm.title}" updated successfully.`);
      } else {
        // Insert new expense
        const { error } = await supabase
          .from('shop_expenses')
          .insert({
            category: finalCategory,
            title: expenseForm.title.trim(),
            amount: amountNum,
            date: expenseForm.date,
            notes: expenseForm.notes.trim() || null,
            staff_id: expenseForm.staff_id || null
          });

        if (error) throw error;
        setSuccessMsg(`Expense "${expenseForm.title}" recorded successfully.`);
      }

      // Reset form
      setExpenseForm({
        id: null,
        category: 'Electricity Bill',
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        staff_id: ''
      });
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setIsEditing(false);
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error saving expense details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Populate form for Editing
  const startEditExpense = (exp) => {
    setIsEditing(true);
    setShowNewCategoryInput(false);
    setExpenseForm({
      id: exp.id,
      category: exp.category,
      title: exp.title,
      amount: exp.amount.toString(),
      date: exp.date,
      notes: exp.notes || '',
      staff_id: exp.staff_id || ''
    });
    // Scroll to form smoothly
    const formElement = document.getElementById('expense-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the expense "${title}"?`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('shop_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMsg(`Expense "${title}" deleted successfully.`);
      loadData();
    } catch (error) {
      setErrorMsg(error.message || 'Error deleting expense.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Salary Inputs state for Manual Tracker
  const handleSalaryInputChange = (staffId, field, value) => {
    setSalaryInputs(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  // Handle Salary Payout Save (Manual Tracker)
  const handleRecordSalaryPayout = async (staffId, staffName) => {
    const inputs = salaryInputs[staffId] || { baseSalary: '', advance: '', bonus: '' };
    const baseVal = parseFloat(inputs.baseSalary) || 0;
    const advanceVal = parseFloat(inputs.advance) || 0;
    const bonusVal = parseFloat(inputs.bonus) || 0;

    if (baseVal <= 0 && advanceVal <= 0 && bonusVal <= 0) {
      alert('Please fill in at least one salary transaction value.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const transactions = [];
      const currentDateStr = new Date().toISOString().split('T')[0];

      if (baseVal > 0) {
        transactions.push({
          category: 'Salary Payout',
          title: `Base Salary - ${staffName}`,
          amount: baseVal,
          date: currentDateStr,
          notes: `Monthly base salary payout for ${staffName}.`,
          staff_id: staffId
        });
      }

      if (advanceVal > 0) {
        transactions.push({
          category: 'Salary Payout',
          title: `Salary Advance - ${staffName}`,
          amount: advanceVal,
          date: currentDateStr,
          notes: `Advance/loan payout for ${staffName}.`,
          staff_id: staffId
        });
      }

      if (bonusVal > 0) {
        transactions.push({
          category: 'Salary Payout',
          title: `Salary Bonus - ${staffName}`,
          amount: bonusVal,
          date: currentDateStr,
          notes: `Performance bonus payout for ${staffName}.`,
          staff_id: staffId
        });
      }

      const { error } = await supabase
        .from('shop_expenses')
        .insert(transactions);

      if (error) throw error;

      setSuccessMsg(`Salary payout transactions recorded for ${staffName}.`);
      
      // Clear inputs for this staff member
      setSalaryInputs(prev => ({
        ...prev,
        [staffId]: { baseSalary: '', advance: '', bonus: '' }
      }));

      loadData();
    } catch (error) {
      setErrorMsg(error.message || `Failed to record salary for ${staffName}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Compute metrics filter strictly by the selectedMonth (to represent operational expenses correctly)
  const historyExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));

  const totalExpenses = historyExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalSalaries = historyExpenses
    .filter(e => e.category === 'Salary Payout')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  
  const totalUtilities = historyExpenses
    .filter(e => ['Electricity Bill', 'Water Bill', 'Shop Rent', 'Electricity/Current Bill'].includes(e.category))
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Overview Summary Cards */}
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon primary">
            <Wallet size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{formatCurrency(totalExpenses)}</span>
            <span className="stat-label">Total Monthly Expenses</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon success">
            <DollarSign size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{formatCurrency(totalSalaries)}</span>
            <span className="stat-label">Total Salaries Paid</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon warning">
            <FileText size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{formatCurrency(totalUtilities)}</span>
            <span className="stat-label">Total Utilities & Bills</span>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
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

      {/* 2. Split Screen: Quick Add and Manual Salary Payout */}
      <div className="dashboard-split equal">
        
        {/* Quick Add Expense Form */}
        <div className="glass-card" id="expense-form-card">
          <h2>{isEditing ? 'Modify Expense Details' : 'Quick Add Expense'}</h2>
          <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isEditing ? 'Edit details for the selected expense entry.' : 'Record shop bills, supplies, utility costs, and other custom payments.'}
          </p>

          <form onSubmit={handleExpenseSubmit}>
            <div className="form-group">
              <label className="form-label">Expense Category</label>
              <select
                className="input-control"
                value={expenseForm.category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setShowNewCategoryInput(true);
                    setExpenseForm({ ...expenseForm, category: '__NEW__' });
                  } else {
                    setShowNewCategoryInput(false);
                    setExpenseForm({ ...expenseForm, category: e.target.value });
                  }
                }}
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="__NEW__" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                  + Add New Category/Expense Name
                </option>
              </select>
            </div>

            {/* Inline New Category Creation Input */}
            {showNewCategoryInput && (
              <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                <label className="form-label">New Custom Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea & Snacks, Water Bill, etc."
                  className="input-control"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Expense Title</label>
              <input
                type="text"
                required
                placeholder="e.g. July Electric Bill, Office tea cups"
                className="input-control"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  placeholder="0.00"
                  className="input-control"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Date</label>
                <input
                  type="date"
                  required
                  className="input-control"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Link to Worker (Optional)</label>
              <select
                className="input-control"
                value={expenseForm.staff_id || ''}
                onChange={(e) => setExpenseForm({ ...expenseForm, staff_id: e.target.value })}
              >
                <option value="">-- Choose Staff Personnel --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea
                placeholder="Optional payment notes or details..."
                className="input-control"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary flex-grow" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Record Expense')}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsEditing(false);
                    setExpenseForm({
                      id: null,
                      category: 'Electricity Bill',
                      title: '',
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      notes: '',
                      staff_id: ''
                    });
                    setShowNewCategoryInput(false);
                    setNewCategoryName('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Manual Salary Payout Tracker */}
        <div className="glass-card flex" style={{ flexDirection: 'column' }}>
          <h2>Quick Payouts / Advances</h2>
          <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Distribute individual salary advances, bonuses, or custom payments to active staff members.
          </p>

          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '490px', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
            {staff.length === 0 ? (
              <div className="text-center" style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No active staff found in directory.</div>
                {setActiveTab && (
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm flex justify-center items-center gap-1"
                    style={{ margin: '0 auto' }}
                    onClick={() => setActiveTab('staff')}
                  >
                    <Plus size={14} /> Go to Staff Directory
                  </button>
                )}
              </div>
            ) : (
              staff.map(s => {
                const inputs = salaryInputs[s.id] || { baseSalary: '', advance: '', bonus: '' };
                return (
                  <div key={s.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between items-center mb-3">
                      <strong>{s.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Salary Cycle: {s.pay_cycle || 'End of month'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Base Salary</label>
                        <input
                          type="number"
                          placeholder="₹ Base"
                          className="input-control"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={inputs.baseSalary}
                          onChange={(e) => handleSalaryInputChange(s.id, 'baseSalary', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Advance / Loan</label>
                        <input
                          type="number"
                          placeholder="₹ Adv."
                          className="input-control"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={inputs.advance}
                          onChange={(e) => handleSalaryInputChange(s.id, 'advance', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Bonus</label>
                        <input
                          type="number"
                          placeholder="₹ Bonus"
                          className="input-control"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={inputs.bonus}
                          onChange={(e) => handleSalaryInputChange(s.id, 'bonus', e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRecordSalaryPayout(s.id, s.name)} 
                      className="btn btn-success btn-sm btn-block"
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      disabled={actionLoading}
                    >
                      Record Payout
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Automated Monthly Salary Reports & Payslip Generator */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2>Automated Monthly Salary Reports</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Calculated dynamically based on worker salary profiles, cycles, actual attendance, and logged advances.
            </p>
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="text-center" style={{ padding: '4rem 1rem' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '1rem' }}>
              No active workers found. Please add worker profiles in the Staff Directory to view reports.
            </div>
            {setActiveTab && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm flex justify-center items-center gap-1"
                style={{ margin: '0 auto' }}
                onClick={() => setActiveTab('staff')}
              >
                <Plus size={14} /> Go to Staff Directory
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
            {staff.map(s => {
              const info = getCycleInfo(s);
              return (
                <div key={s.id} className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{s.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>Cycle: {s.pay_cycle || 'End of month'}</span>
                    </div>
                    {info.isPaid ? (
                      <span className="badge badge-success flex items-center gap-1">
                        <Check size={12} /> Paid
                      </span>
                    ) : (
                      <span className="badge badge-warning">Unpaid</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.75rem' }}>
                    <div className="flex justify-between mb-1">
                      <span>Date range:</span>
                      <strong style={{ color: '#fff' }}>{info.start} to {info.end}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cycle Days:</span>
                      <strong>{info.totalDays} Days</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Monthly Salary Profile:</span>
                      <span>{formatCurrency(info.monthlySalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Attendance:</span>
                      <span style={{ color: 'var(--success-color)' }}>{info.daysPresent} Present <span style={{ color: 'var(--text-muted)' }}>/</span> <span style={{ color: 'var(--danger-color)' }}>{info.daysAbsent} Absent</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Calculated Base Payable:</span>
                      <span>{formatCurrency(info.basePayable)}</span>
                    </div>
                    {info.totalBonuses > 0 && (
                      <div className="flex justify-between" style={{ color: 'var(--success-color)' }}>
                        <span>Cycle Bonuses (+):</span>
                        <span>{formatCurrency(info.totalBonuses)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ color: 'var(--danger-color)' }}>
                      <span>Cycle Advances/Loans (-):</span>
                      <span>{formatCurrency(info.totalAdvances)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {info.isPaid ? 'Amount Transferred' : 'Net Payable Salary'}
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: info.isPaid ? 'var(--text-secondary)' : 'var(--success-color)' }}>
                        {formatCurrency(info.isPaid ? info.paidAmount : info.netPayable)}
                      </strong>
                    </div>

                    {!info.isPaid ? (
                      <button 
                        onClick={() => handleLogSalaryPayout(s.id, s.name, info)}
                        className="btn btn-primary btn-sm flex items-center gap-1"
                        disabled={actionLoading || info.netPayable <= 0}
                      >
                        <DollarSign size={14} /> Log Payout
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in expenses</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Management Settings Card (Owners only) */}
      {isOwner && (
        <div className="glass-card">
          <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>Manage Expense Categories</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add or remove categories dynamically. Default categories are protected.</p>
            </div>
            <form onSubmit={handleCreateCategoryDirectly} className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input-control"
                placeholder="New category name..."
                style={{ width: '220px', padding: '0.5rem' }}
                value={directCategoryInput}
                onChange={(e) => setDirectCategoryInput(e.target.value)}
                disabled={actionLoading}
              />
              <button type="submit" className="btn btn-primary flex items-center gap-1" style={{ padding: '0.5rem 1rem' }} disabled={actionLoading}>
                <Plus size={16} /> Add Category
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {categories.map(cat => {
              const isDefault = DEFAULT_CATEGORIES.includes(cat.name);
              return (
                <span 
                  key={cat.id} 
                  className="badge badge-neutral" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.5rem 0.75rem', 
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  {cat.name}
                  {isDefault ? (
                    <Shield size={12} style={{ opacity: 0.5 }} title="Default protected category" />
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteCategory(cat.id, cat.name)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      title={`Delete "${cat.name}"`}
                      disabled={actionLoading}
                    >
                      <X size={13} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Expense History Table */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Expense & Salary History</h2>
          
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Choose Month:</span>
            <input
              type="month"
              className="input-control"
              style={{ width: '160px', padding: '0.4rem' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button onClick={loadData} className="btn btn-secondary btn-sm" style={{ padding: '0.5rem' }} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="spinner-container" style={{ padding: '3rem 0' }}>
            <div className="spinner"></div>
          </div>
        ) : historyExpenses.length === 0 ? (
          <div className="text-center" style={{ padding: '4rem 1rem' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No expense records found for the month of {selectedMonth}.</div>
            <button 
              type="button" 
              className="btn btn-primary btn-sm flex justify-center items-center gap-1"
              style={{ margin: '0 auto' }}
              onClick={() => {
                const titleInput = document.querySelector('input[placeholder="e.g. July Electric Bill, Office tea cups"]');
                if (titleInput) titleInput.focus();
              }}
            >
              <Plus size={14} /> Add First Expense
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '25%' }}>Title</th>
                  <th style={{ width: '15%' }}>Amount</th>
                  <th style={{ width: '15%' }}>Notes</th>
                  <th style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyExpenses.map(e => (
                  <tr key={e.id}>
                    <td><span className="flex items-center gap-1"><Calendar size={13} style={{ color: 'var(--text-muted)' }} /> {e.date}</span></td>
                    <td>
                      <span className={`badge ${
                        e.category === 'Electricity Bill' || e.category === 'Electricity/Current Bill' ? 'badge-warning' : 
                        e.category === 'Water Bill' ? 'badge-info' :
                        e.category === 'Shop Rent' ? 'badge-danger' :
                        e.category === 'Salary Payout' ? 'badge-success' : 
                        e.category === 'Maintenance' ? 'badge-neutral' :
                        e.category === 'Supplies' ? 'badge-info' : 'badge-neutral'
                      }`} style={{ textTransform: 'none' }}>
                        {e.category}
                      </span>
                    </td>
                    <td><strong style={{ color: '#fff' }}>{e.title}</strong></td>
                    <td><strong style={{ color: 'var(--success-color)' }}>{formatCurrency(e.amount)}</strong></td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} title={e.notes}>
                        {e.notes || '--'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEditExpense(e)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }} title="Edit expense">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDeleteExpense(e.id, e.title)} className="btn btn-danger btn-sm" style={{ padding: '0.35rem' }} title="Delete expense">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
