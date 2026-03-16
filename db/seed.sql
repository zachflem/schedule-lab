-- ============================================
-- SCHEDULELAB DEV SEED DATA
-- Realistic test records for local development
-- ============================================

-- PLATFORM SETTINGS
INSERT INTO platform_settings (id, company_name, logo_url, primary_color)
VALUES ('global', 'Fleming Crane Hire', NULL, '#2563eb')
ON CONFLICT(id) DO NOTHING;

-- CUSTOMERS
INSERT INTO customers (id, name, email, phone, billing_address, contact_details) VALUES
  ('c001', 'Acme Construction', 'accounts@acme.com.au', '07 3000 1111', '42 Builder St, Brisbane QLD 4000', '{"name":"Tom Smith","phone":"0412 111 222","email":"tom@acme.com.au"}'),
  ('c002', 'Pacific Developments', 'admin@pacdev.com.au', '07 3000 2222', '88 Harbour Dr, Gold Coast QLD 4217', '{"name":"Sarah Chen","phone":"0412 333 444","email":"sarah@pacdev.com.au"}')
ON CONFLICT(id) DO NOTHING;

-- ASSET TYPES
INSERT INTO asset_types (id, name, checklist_questions) VALUES
  ('at01', 'Crane', '["Is all PPE worn?","Are outriggers fully extended?","Is load chart available?","Are exclusion zones marked?","Is ground firm and level?"]'),
  ('at02', 'Excavator', '["Is all PPE worn?","Are tracks in good condition?","Is bucket secured?","Are hydraulics leak-free?"]'),
  ('at03', 'Truck', '["Is all PPE worn?","Are tyres in good condition?","Are lights working?","Is load secured?"]')
ON CONFLICT(id) DO NOTHING;

-- ASSET TYPE EXTENSION SCHEMAS (configurable per type)
INSERT INTO asset_type_extension_schemas (id, asset_type_id, schema) VALUES
  ('es01', 'at01', '[{"key":"boom_length_m","label":"Max Boom Length (m)","type":"number","required":true},{"key":"max_capacity_t","label":"Max Lift Capacity (t)","type":"number","required":true},{"key":"counterweight_t","label":"Counterweight (t)","type":"number","required":false},{"key":"jib_fitted","label":"Jib Fitted","type":"boolean","required":false}]'),
  ('es02', 'at02', '[{"key":"bucket_size_m3","label":"Bucket Size (m³)","type":"number","required":true},{"key":"max_dig_depth_m","label":"Max Dig Depth (m)","type":"number","required":false},{"key":"zero_tail_swing","label":"Zero Tail Swing","type":"boolean","required":false}]'),
  ('es03', 'at03', '[{"key":"gvm_t","label":"GVM (t)","type":"number","required":true},{"key":"body_type","label":"Body Type","type":"select","required":false,"options":["Tray","Tipper","Flatbed","Crane Truck"]}]')
ON CONFLICT(id) DO NOTHING;

-- QUALIFICATIONS
INSERT INTO qualifications (id, name, rate_hourly, rate_after_hours) VALUES
  ('q01', 'Crane Operator', 85.00, 127.50),
  ('q02', 'Dogman / Rigger', 72.00, 108.00),
  ('q03', 'Excavator Operator', 78.00, 117.00)
ON CONFLICT(id) DO NOTHING;

-- ASSETS
INSERT INTO assets (id, name, asset_type_id, category, required_qualification_id, rate_hourly, rate_after_hours, rate_dry_hire, required_operators, cranesafe_expiry, current_machine_hours, current_odometer, service_interval_type, service_interval_value, last_service_meter_reading) VALUES
  ('a01', 'Liebherr LTM 1100', 'at01', '100T', 'q01', 285.00, 427.50, 220.00, 1, '2026-12-31', 4520, 0, 'hours', 250, 4400),
  ('a02', 'Franna AT-20', 'at01', '20T', 'q01', 195.00, 292.50, 150.00, 1, '2026-09-15', 3200, 52000, 'hours', 250, 3100),
  ('a03', 'CAT 320 Excavator', 'at02', '20T', 'q03', 165.00, 247.50, 130.00, 1, NULL, 2800, 0, 'hours', 500, 2600),
  ('a04', 'Isuzu FVZ 1400', 'at03', 'Heavy Rigid', NULL, 95.00, 142.50, 75.00, 1, NULL, 0, 182000, 'odometer', 15000, 175000)
ON CONFLICT(id) DO NOTHING;

-- ASSET EXTENSIONS
INSERT INTO asset_extensions (id, asset_id, data) VALUES
  ('ae01', 'a01', '{"boom_length_m":52,"max_capacity_t":100,"counterweight_t":36,"jib_fitted":true}'),
  ('ae02', 'a02', '{"boom_length_m":23.4,"max_capacity_t":20,"counterweight_t":0,"jib_fitted":false}'),
  ('ae03', 'a03', '{"bucket_size_m3":0.9,"max_dig_depth_m":6.7,"zero_tail_swing":false}'),
  ('ae04', 'a04', '{"gvm_t":14,"body_type":"Crane Truck"}')
ON CONFLICT(id) DO NOTHING;

-- PERSONNEL
INSERT INTO personnel (id, name, email, phone, can_login) VALUES
  ('p01', 'Dave Wilson', 'dave@fleming.com.au', '0400 111 001', 1),
  ('p02', 'Matt Brown', 'matt@fleming.com.au', '0400 111 002', 1),
  ('p03', 'Jake Torres', 'jake@fleming.com.au', '0400 111 003', 0),
  ('p04', 'Lisa Nguyen', 'lisa@fleming.com.au', '0400 111 004', 1)
ON CONFLICT(id) DO NOTHING;

-- PERSONNEL QUALIFICATIONS
INSERT INTO personnel_qualifications (id, personnel_id, qualification_id, expiry_date) VALUES
  ('pq01', 'p01', 'q01', '2027-03-15'),
  ('pq02', 'p01', 'q02', '2027-03-15'),
  ('pq03', 'p02', 'q01', '2026-11-30'),
  ('pq04', 'p03', 'q02', '2027-06-01'),
  ('pq05', 'p04', 'q03', '2027-01-15')
ON CONFLICT(id) DO NOTHING;

-- ENQUIRIES
INSERT INTO enquiries (id, enquiry_type, customer_name, contact_email, contact_phone, job_details, location, preferred_date, status, anticipated_hours, asset_type_id, asset_requirement) VALUES
  ('e01', 'Job', 'New Builder Co', 'info@newbuilder.com.au', '07 3111 5555', 'Need a 20T crane for steel erection, single day job.', '15 Main St, Southport QLD', '2026-04-10', 'New', 8, 'at01', '20T Franna or similar'),
  ('e02', 'Project', 'Pacific Developments', 'sarah@pacdev.com.au', '0412 333 444', 'Multi-story apartment build. Crane and excavation over 6-month project.', '200 Esplanade, Surfers Paradise QLD', NULL, 'Reviewed', NULL, NULL, '50T+ mobile crane, 20T excavator')
ON CONFLICT(id) DO NOTHING;

-- Update project enquiry with date range
UPDATE enquiries SET project_start_date = '2026-05-01', project_end_date = '2026-11-30' WHERE id = 'e02';

-- PROJECTS
INSERT INTO projects (id, customer_id, enquiry_id, name, description, status, start_date, end_date, po_number) VALUES
  ('pr01', 'c002', 'e02', 'Esplanade Apartments Build', 'Multi-story apartment construction — crane and excavation services.', 'Active', '2026-05-01', '2026-11-30', 'PO-PAC-2026-001')
ON CONFLICT(id) DO NOTHING;

-- JOBS (various statuses to demonstrate lifecycle)
INSERT INTO jobs (id, customer_id, project_id, status_id, location, asset_requirement, po_number, job_brief, max_weight, pricing, task_description) VALUES
  ('j01', 'c001', NULL, 'Allocated', '42 Builder St, Brisbane QLD', '20T Franna', 'PO-ACM-001', 'Steel beam placement — level 3 car park', 2.5, 1950.00, 'Supply 20T Franna for steel erection. Approx 8hr day.'),
  ('j02', 'c002', 'pr01', 'Enquiry', '200 Esplanade, Surfers Paradise QLD', '100T Mobile Crane', NULL, 'Tower crane assembly assistance', 15, NULL, NULL),
  ('j03', 'c001', NULL, 'Completed', '10 Industrial Ave, Eagle Farm QLD', '20T Franna + Dogman', 'PO-ACM-002', 'AC unit lift to rooftop — 3 units', 1.8, 2340.00, 'Supply Franna 20T with dogman for HVAC lift. 3x units, est 6hrs.')
ON CONFLICT(id) DO NOTHING;

-- JOB RESOURCES (for quoted job j01)
INSERT INTO job_resources (id, job_id, resource_type, asset_id, qualification_id, rate_type, rate_amount, qty, total) VALUES
  ('jr01', 'j01', 'Asset', 'a02', NULL, 'Hourly', 195.00, 8, 1560.00),
  ('jr02', 'j01', 'Personnel', NULL, 'q01', 'Hourly', 85.00, 8, 680.00)
ON CONFLICT(id) DO NOTHING;

-- COMPLETED DOCKET (for job j03)
INSERT INTO site_dockets (id, job_id, date, time_leave_yard, time_arrive_site, time_leave_site, time_return_yard, operator_hours, machine_hours, break_duration_minutes, pre_start_safety_check, hazards, asset_metrics, job_description_actual, signatures, is_locked, locked_at, locked_by, end_machine_hours, end_odometer) VALUES
  ('d01', 'j03', '2026-03-10', '2026-03-10T05:30:00Z', '2026-03-10T06:15:00Z', '2026-03-10T12:30:00Z', '2026-03-10T13:15:00Z',
   7.75, 6.25, 30,
   '{"estWeight":"1.8","weightUnit":"t","estRadius":"12","craneCapacity":"20","capacityPercent":9,"commMethods":["UHF Radio","Hand Signals"],"checks":{"a02_q0":"YES","a02_q1":"YES","a02_q2":"YES","a02_q3":"YES","a02_q4":"YES"}}',
   '[{"detail":"Overhead power lines within 10m","control":"Spotter assigned, exclusion zone marked"},{"detail":"Uneven ground at drop zone","control":"Timber packing placed, levels checked"}]',
   '[{"asset_id":"a02","asset_name":"Franna AT-20","asset_type_name":"Crane","start_odometer":"52000","start_engine_lower":"3200","start_engine_upper":"","end_odometer":"52045","end_engine_lower":"3206","end_engine_upper":""}]',
   'Lifted 3x Daikin AC units to rooftop. All lifts completed safely. Minor delay due to wind gust (20min hold). Customer satisfied.',
   '[{"signatory_name":"Dave Wilson","signatory_role":"Operator","signature_blob":"data:image/png;base64,iVBOR...stub","signed_at":"2026-03-10T12:35:00Z","signed_lat":-27.4475,"signed_lng":153.0844,"device_info":"Mozilla/5.0"},{"signatory_name":"Tom Smith","signatory_role":"Customer","signature_blob":"data:image/png;base64,iVBOR...stub","signed_at":"2026-03-10T12:36:00Z","signed_lat":-27.4475,"signed_lng":153.0844}]',
   1, '2026-03-10T12:36:00Z', 'p01', 3206, 52045)
ON CONFLICT(id) DO NOTHING;

-- DOCKET LINE ITEMS
INSERT INTO docket_line_items (id, docket_id, asset_id, personnel_id, description, inventory_code, quantity, unit_rate, is_taxable) VALUES
  ('dl01', 'd01', 'a02', NULL, 'Franna AT-20 — Hourly Hire', 'CRANE-20T-HR', 6.25, 195.00, 1),
  ('dl02', 'd01', NULL, 'p01', 'Crane Operator — Dave Wilson', 'OP-CRANE-HR', 7.75, 85.00, 1),
  ('dl03', 'd01', NULL, 'p03', 'Dogman/Rigger — Jake Torres', 'RIG-DOG-HR', 7.75, 72.00, 1)
ON CONFLICT(id) DO NOTHING;

-- NEW DUMMY JOB FOR VERIFICATION (j04)
INSERT INTO jobs (id, customer_id, project_id, status_id, location, asset_requirement, po_number, job_brief, max_weight, pricing, task_description) VALUES
  ('j04', 'c001', NULL, 'Allocated', '123 Test Lane, Brisbane QLD', '20T Franna', 'PO-VERIFY-001', 'Verification of Date/Time fix', 1.0, 500.00, 'Test job to verify that date/time selectors preserve Wall Clock Time.')
ON CONFLICT(id) DO NOTHING;

-- RESOURCE FOR j04
INSERT INTO job_resources (id, job_id, resource_type, asset_id, qualification_id, rate_type, rate_amount, qty, total) VALUES
  ('jr03', 'j04', 'Asset', 'a02', NULL, 'Hourly', 195.00, 4, 780.00)
ON CONFLICT(id) DO NOTHING;
