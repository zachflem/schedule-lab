-- Migration: Add role to personnel table
ALTER TABLE personnel ADD COLUMN role TEXT DEFAULT 'dispatcher';

-- Set first user as Admin (User is Zachflem@gmail.com)
UPDATE personnel SET role = 'admin' WHERE email = 'Zachflem@gmail.com';
