-- Supabase Database Schema for Shop Attendance System
-- Run this script in the Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (maps to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'pending' CHECK (role IN ('owner', 'manager', 'pending')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create staff table (the shop staff members)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    expected_in_time TIME DEFAULT '09:00:00', -- standard shift start time
    created_at TIMESTAMPTZ DEFAULT NOW(),
    joined_date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS for staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    in_time TIMESTAMPTZ, -- actual arrival time
    out_time TIMESTAMPTZ, -- actual departure time
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_staff_date UNIQUE (staff_id, date)
);

-- Enable RLS for attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- TRIGGERS FOR PROFILE CREATION ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        -- Auto-approve the first signup as 'owner', others as 'pending'
        CASE 
            WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner') = 0 THEN 'owner'
            ELSE 'pending'
        END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ROW LEVEL SECURITY (RLS) POLICIES

-- profiles Policies:
-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- 2. Owners can read all profiles
CREATE POLICY "Owners can view all profiles" 
    ON public.profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 3. Owners can update all profiles (e.g. change roles)
CREATE POLICY "Owners can update all profiles" 
    ON public.profiles FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );


-- staff Policies:
-- 1. Owners and Managers can select staff (both active and inactive)
CREATE POLICY "Owners and managers can view staff" 
    ON public.staff FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'manager')
        )
    );

-- 2. Only Owners can insert staff
CREATE POLICY "Owners can insert staff" 
    ON public.staff FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 3. Only Owners can update staff
CREATE POLICY "Owners can update staff" 
    ON public.staff FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 4. Only Owners can delete staff
CREATE POLICY "Owners can delete staff" 
    ON public.staff FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );


-- attendance Policies:
-- 1. Owners and Managers can view attendance
CREATE POLICY "Owners and managers can view attendance" 
    ON public.attendance FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'manager')
        )
    );

-- 2. Owners can insert any attendance
CREATE POLICY "Owners can insert any attendance" 
    ON public.attendance FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 3. Owners can update any attendance
CREATE POLICY "Owners can update any attendance" 
    ON public.attendance FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 4. Owners can delete any attendance
CREATE POLICY "Owners can delete any attendance" 
    ON public.attendance FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 5. Managers can mark/insert attendance ONLY for today
CREATE POLICY "Managers can insert attendance for today" 
    ON public.attendance FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
        AND date = CURRENT_DATE
    );

-- 6. Managers can update attendance ONLY for today
CREATE POLICY "Managers can update attendance for today" 
    ON public.attendance FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
        AND date = CURRENT_DATE
    );
