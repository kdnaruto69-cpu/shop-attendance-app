import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we should use Mock client (when environment keys are placeholders or empty)
const useMock = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-project-id') || 
  supabaseAnonKey.includes('your-supabase-anon-key');

let supabaseClient;
const mockChannels = []; // Channels registry for mock realtime

if (!useMock) {
  // Use real Supabase client with sessionStorage persistence
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: window.sessionStorage, // Auto logout when tab closes
      autoRefreshToken: true,
      persistSession: true,
    },
  });
} else {
  console.log('⚡ Using Mock Supabase client for demonstration/review.');
  
  // Seed initial mock data in localStorage if not present
  const seedMockData = () => {
    // Check seed version. If old or not v9, clear existing mock data to apply the fresh clean state
    const seedVersion = localStorage.getItem('mock_seed_version');
    if (seedVersion !== 'v9') {
      localStorage.removeItem('mock_profiles');
      localStorage.removeItem('mock_staff');
      localStorage.removeItem('mock_attendance');
      localStorage.removeItem('mock_shop_expenses');
      localStorage.removeItem('mock_expense_categories');
      sessionStorage.removeItem('mock_session');
      localStorage.setItem('mock_seed_version', 'v9');
    }

    // 1. Seed Users / Profiles (Seeding fresh owner credentials set by AI)
    if (!localStorage.getItem('mock_profiles')) {
      const initialProfiles = [
        { 
          id: 'owner-id', 
          email: 'owner@shop.com', 
          full_name: 'V-Mart Owner', 
          role: 'owner', 
          password: 'owner123', // Pre-seeded password
          updated_at: new Date().toISOString() 
        }
      ];
      localStorage.setItem('mock_profiles', JSON.stringify(initialProfiles));
    }

    // 2. Seed Staff (Start clean - empty array)
    if (!localStorage.getItem('mock_staff')) {
      localStorage.setItem('mock_staff', JSON.stringify([]));
    }

    // 3. Seed Attendance History (Start clean - empty array)
    if (!localStorage.getItem('mock_attendance')) {
      localStorage.setItem('mock_attendance', JSON.stringify([]));
    }

    // 4. Seed Shop Expenses (Start clean - empty array)
    if (!localStorage.getItem('mock_shop_expenses')) {
      localStorage.setItem('mock_shop_expenses', JSON.stringify([]));
    }

    // 5. Seed Default Expense Categories
    if (!localStorage.getItem('mock_expense_categories')) {
      const defaultCategories = [
        { id: 'cat-1', name: 'Electricity Bill', created_at: new Date().toISOString() },
        { id: 'cat-2', name: 'Water Bill', created_at: new Date().toISOString() },
        { id: 'cat-3', name: 'Shop Rent', created_at: new Date().toISOString() },
        { id: 'cat-4', name: 'Salary Payout', created_at: new Date().toISOString() },
        { id: 'cat-5', name: 'Maintenance', created_at: new Date().toISOString() },
        { id: 'cat-6', name: 'Supplies', created_at: new Date().toISOString() },
        { id: 'cat-7', name: 'Other', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('mock_expense_categories', JSON.stringify(defaultCategories));
    }
  };

  seedMockData();

  // Thenable Mock Query Builder to support await and method chaining (.eq().select().maybeSingle())
  class MockQueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderConfig = null;
      this.isSingle = false;
      this.isMaybeSingle = false;
      this.queryType = 'select'; // 'select' | 'insert' | 'update' | 'upsert' | 'delete'
      this.payload = null;
      this.columns = '*';
    }

    select(columns = '*', options = {}) {
      this.queryType = 'select';
      this.columns = columns;
      this.selectOptions = options;
      return this;
    }

    insert(row) {
      this.queryType = 'insert';
      this.payload = row;
      return this;
    }

    update(updateObj) {
      this.queryType = 'update';
      this.payload = updateObj;
      return this;
    }

    upsert(row) {
      this.queryType = 'upsert';
      this.payload = row;
      return this;
    }

    delete() {
      this.queryType = 'delete';
      return this;
    }

    eq(col, val) {
      this.filters.push(item => item[col] === val);
      return this;
    }

    gte(col, val) {
      this.filters.push(item => item[col] >= val);
      return this;
    }

    lte(col, val) {
      this.filters.push(item => item[col] <= val);
      return this;
    }

    order(col, { ascending = true } = {}) {
      this.orderConfig = { col, ascending };
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    maybeSingle() {
      this.isMaybeSingle = true;
      return this;
    }

    // Evaluates filter matches locally
    getData() {
      let data = JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
      this.filters.forEach(filter => {
        data = data.filter(filter);
      });
      return data;
    }

    // Executes the query operations
    async execute() {
      try {
        if (this.queryType === 'select') {
          let data = this.getData();

          // Simulates relational join with 'staff' table
          if (this.columns.includes('staff')) {
            const staffList = JSON.parse(localStorage.getItem('mock_staff') || '[]');
            data = data.map(item => {
              const associatedStaff = staffList.find(s => s.id === item.staff_id);
              return {
                ...item,
                staff: associatedStaff || null
              };
            });
          }

          // Simulates relational join with 'profiles' table for updater
          if (this.columns.includes('updater') || this.columns.includes('profiles')) {
            const profilesList = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
            data = data.map(item => {
              const associatedUpdater = profilesList.find(p => p.id === item.updated_by);
              return {
                ...item,
                updater: associatedUpdater || null
              };
            });
          }

          if (this.orderConfig) {
            const { col, ascending } = this.orderConfig;
            data.sort((a, b) => {
              if (a[col] < b[col]) return ascending ? -1 : 1;
              if (a[col] > b[col]) return ascending ? 1 : -1;
              return 0;
            });
          }

          let count = null;
          if (this.selectOptions && this.selectOptions.count === 'exact') {
            count = data.length;
          }
          if (this.selectOptions && this.selectOptions.head === true) {
            data = [];
          }

          if (this.isSingle) {
            if (data.length === 0) return { data: null, count, error: { message: 'Row not found' } };
            return { data: data[0], count, error: null };
          }
          if (this.isMaybeSingle) {
            return { data: data[0] || null, count, error: null };
          }
          return { data, count, error: null };
        }

        if (this.queryType === 'insert') {
          let data = JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
          const newRows = rows.map(r => ({
            id: r.id || `mock-id-${Math.random().toString(36).substring(2, 9)}`,
            ...r,
            created_at: new Date().toISOString()
          }));
          data.push(...newRows);
          localStorage.setItem(`mock_${this.table}`, JSON.stringify(data));
          return { data: newRows, error: null };
        }

        if (this.queryType === 'update') {
          let allData = JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
          const filteredData = this.getData();
          const updatedIds = filteredData.map(f => f.id);

          const updatedPayloads = [];
          allData = allData.map(item => {
            if (updatedIds.includes(item.id)) {
              const updatedItem = { ...item, ...this.payload, updated_at: new Date().toISOString() };
              updatedPayloads.push(updatedItem);
              return updatedItem;
            }
            return item;
          });

          localStorage.setItem(`mock_${this.table}`, JSON.stringify(allData));

          // Mock Realtime broadcast for updates on the profiles table
          if (this.table === 'profiles') {
            updatedPayloads.forEach(updatedProfile => {
              mockChannels.forEach(chan => {
                if (chan.event === 'UPDATE' || chan.event === '*') {
                  const filterIdVal = chan.filterObj?.filter?.split('eq.')?.[1];
                  if (!filterIdVal || filterIdVal === updatedProfile.id) {
                    chan.callback({
                      schema: 'public',
                      table: 'profiles',
                      commit_timestamp: new Date().toISOString(),
                      eventType: 'UPDATE',
                      new: updatedProfile,
                      old: updatedProfile
                    });
                  }
                }
              });
            });
          }

          return { data: this.payload, error: null };
        }

        if (this.queryType === 'upsert') {
          let data = JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload];

          rows.forEach(r => {
            let matchIdx = -1;
            if (this.table === 'attendance') {
              matchIdx = data.findIndex(item => item.staff_id === r.staff_id && item.date === r.date);
            } else if (r.id) {
              matchIdx = data.findIndex(item => item.id === r.id);
            }

            if (matchIdx >= 0) {
              data[matchIdx] = { ...data[matchIdx], ...r, updated_at: new Date().toISOString() };
            } else {
              data.push({
                id: r.id || `mock-id-${Math.random().toString(36).substring(2, 9)}`,
                ...r,
                created_at: new Date().toISOString()
              });
            }
          });

          localStorage.setItem(`mock_${this.table}`, JSON.stringify(data));
          return { data: rows, error: null };
        }

        if (this.queryType === 'delete') {
          let allData = JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
          const filteredData = this.getData();
          const deleteIds = filteredData.map(f => f.id);

          allData = allData.filter(item => !deleteIds.includes(item.id));
          localStorage.setItem(`mock_${this.table}`, JSON.stringify(allData));
          return { data: null, error: null };
        }
      } catch (err) {
        return { data: null, error: err };
      }
    }

    // Thenable resolution (enables standard 'await builder')
    then(onFulfilled, onRejected) {
      return this.execute().then(onFulfilled, onRejected);
    }
  }

  // Auth State callbacks list
  const authStateListeners = [];
  
  // Current session mock state
  let currentSession = JSON.parse(sessionStorage.getItem('mock_session') || 'null');

  const triggerAuthChange = (event, session) => {
    authStateListeners.forEach(listener => listener(event, session));
  };

  // Mock Client Interface
  supabaseClient = {
    auth: {
      async getSession() {
        return { data: { session: currentSession }, error: null };
      },
      
      onAuthStateChange(callback) {
        authStateListeners.push(callback);
        // Call it immediately with current session
        callback('SIGNED_IN', currentSession);
        
        return {
          data: {
            subscription: {
              unsubscribe() {
                const idx = authStateListeners.indexOf(callback);
                if (idx !== -1) authStateListeners.splice(idx, 1);
              }
            }
          }
        };
      },

      async signInWithPassword({ email, password }) {
        // Let's resolve username to email if it does not contain '@'
        let formattedEmail = email.trim();
        if (!formattedEmail.includes('@')) {
          formattedEmail = `${formattedEmail}@shop.com`;
        }

        const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        const matched = profiles.find(p => p.email.toLowerCase() === formattedEmail.toLowerCase());
        
        // Strict password checking for seeded users
        if (!matched || (matched.password && matched.password !== password)) {
          return { data: null, error: { message: 'Invalid credentials. Use username "owner" and password "owner123".' } };
        }
        
        // Successful mock login
        const newSession = {
          user: { id: matched.id, email: matched.email },
          access_token: 'mock-jwt-token'
        };
        currentSession = newSession;
        sessionStorage.setItem('mock_session', JSON.stringify(newSession));
        triggerAuthChange('SIGNED_IN', newSession);
        return { data: newSession, error: null };
      },

      async signUp({ email, password, options }) {
        // Let's resolve username to email if it does not contain '@'
        let formattedEmail = email.trim();
        if (!formattedEmail.includes('@')) {
          formattedEmail = `${formattedEmail}@shop.com`;
        }

        const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        const exists = profiles.some(p => p.email.toLowerCase() === formattedEmail.toLowerCase());
        
        if (exists) {
          return { data: null, error: { message: 'User already exists.' } };
        }

        const newId = `user-id-${Math.random().toString(36).substring(2, 9)}`;
        const hasOwner = profiles.some(p => p.role === 'owner');
        const role = hasOwner ? 'pending' : 'owner'; // First signup gets Owner status

        const newProfile = {
          id: newId,
          email: formattedEmail.toLowerCase(),
          full_name: options?.data?.full_name || '',
          role: role,
          password: password, // Store password so added managers can log in
          updated_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));

        return { data: { user: { id: newId, email: formattedEmail } }, error: null };
      },

      async signOut() {
        currentSession = null;
        sessionStorage.removeItem('mock_session');
        triggerAuthChange('SIGNED_OUT', null);
        return { error: null };
      }
    },

    from(table) {
      return new MockQueryBuilder(table);
    },

    // Mock Realtime Channel Implementation
    channel(name) {
      const channelObj = {
        on(event, filterObj, callback) {
          mockChannels.push({ name, event, filterObj, callback });
          return this;
        },
        subscribe() {
          return this;
        }
      };
      return channelObj;
    },

    removeChannel(channel) {
      // Clear matching channels in registry
      mockChannels.length = 0;
    }
  };
}

// Secondary client creator (allows signUp without clearing owner session)
export const createSecondaryClient = () => {
  if (useMock) {
    return {
      auth: {
        async signUp({ email, password, options }) {
          return supabase.auth.signUp({ email, password, options });
        }
      }
    };
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

export const supabase = supabaseClient;
export { useMock };
