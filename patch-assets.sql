ALTER TABLE public.asset_types ADD COLUMN IF NOT EXISTS checklist_questions JSONB DEFAULT '[]'::jsonb;

UPDATE public.asset_types
SET checklist_questions = '["Has the crane/lifting device been project onboarded and had a daily prestart conducted by the operator?", "Has the lifting area been secured for unintended access by pedestrians and/or vehicles?", "Has an appropriate exclusion zone been established around the lift area?", "Has the crane/lifting device been set-up according to the OEM instructions and is suitable for the load being lifted?", "Are the ground conditions hard, level and assessed as safe to lift by the Operator and Dogman/Rigger?", "Crane and load path are clear of powerlines and other overhead obstructions?", "Are all lifting points deemed suitable for the intended load?", "Has all rigging equipment been inspected and deemed suitable for the intended load?", "Have all slings and rigging been protected from damage during the lift?", "Is the travel path for the load and/or crane/lifting device clear from people and obstructions?", "Is there an appropriate method for controlling the load as required? (Tag Lines, Push Poles, etc)", "Are wind/weather conditions suitable for lifting?"]'::jsonb
WHERE name = 'Crane';

NOTIFY pgrst, 'reload schema';
