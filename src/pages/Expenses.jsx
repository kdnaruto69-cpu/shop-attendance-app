import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Edit2, Trash2, Wallet, FileText, Calendar, 
  Check, AlertCircle, X, DollarSign, RefreshCw, Plus, Shield
} from 'lucide-react';

const DEFAULT_CATEGORIES = ['Electricity Bill', 'Water Bill', 'Shop Rent', 'Salary Payout', 'Maintenance', 'Supplies', 'Other'];

export default function Expenses({ userProfile }) {
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
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
    notes: ''
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

  // Load staff, expenses, and categories
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch active staff members for Salary tracker
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

      // 2. Fetch expenses for selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startOfMonth = `${selectedMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data: expenseData, error: expenseError } = await supabase
        .from('shop_expenses')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
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
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to load expense, category, and salary data.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            notes: expenseForm.notes.trim() || null
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
            notes: expenseForm.notes.trim() || null
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
        notes: ''
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
      notes: exp.notes || ''
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

  // Update Salary Inputs state
  const handleSalaryInputChange = (staffId, field, value) => {
    setSalaryInputs(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  // Handle Salary Payout Save
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
          notes: `Monthly base salary payout for ${staffName}.`
        });
      }

      if (advanceVal > 0) {
        transactions.push({
          category: 'Salary Payout',
          title: `Salary Advance/Loan - ${staffName}`,
          amount: advanceVal,
          date: currentDateStr,
          notes: `Advance/loan payout for ${staffName}.`
        });
      }

      if (bonusVal > 0) {
        transactions.push({
          category: 'Salary Payout',
          title: `Salary Bonus - ${staffName}`,
          amount: bonusVal,
          date: currentDateStr,
          notes: `Performance bonus payout for ${staffName}.`
        });
      }

      const { error } = await supabase
        .from('shop_expenses')
        .insert(transactions);

      if (error) throw error;

      setSuccessMsg(`Salary payout recorded for ${staffName}.`);
      
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

  // Compute metrics for the selected month
  const totalExpenses = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalSalaries = expenses
    .filter(e => e.category === 'Salary Payout')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  
  // Bills filter covers 'Electricity Bill', 'Water Bill', 'Shop Rent', and legacy 'Electricity/Current Bill'
  const totalUtilities = expenses
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

      {/* 2. Split Screen: Quick Add and Salary Tracker */}
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
                      notes: ''
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

        {/* Salary Payout Tracker */}
        <div className="glass-card flex" style={{ flexDirection: 'column' }}>
          <h2>Salary Payout Tracker</h2>
          <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Distribute monthly salaries, loans/advances, or bonuses to active staff members.
          </p>

          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
            {staff.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>
                No active staff found. Add staff in the "Staff Directory" tab.
              </div>
            ) : (
              staff.map(s => {
                const inputs = salaryInputs[s.id] || { baseSalary: '', advance: '', bonus: '' };
                return (
                  <div key={s.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.015)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between items-center mb-3">
                      <strong>{s.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Expected Shift: {s.expected_in_time ? s.expected_in_time.slice(0, 5) : '09:00'}
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

      {/* 3. Expense History Table */}
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
        ) : expenses.length === 0 ? (
          <div className="text-center" style={{ padding: '4rem 0', color: 'var(--text-muted)' }}>
            No expense records found for the month of {selectedMonth}.
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
                {expenses.map(e => (
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
