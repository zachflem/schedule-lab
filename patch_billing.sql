-- Billing schema updates: Payment Terms, PO Numbers, Docket Line Items

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);

CREATE TABLE IF NOT EXISTS public.docket_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docket_id UUID REFERENCES public.site_dockets(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id),
    personnel_id UUID REFERENCES public.personnel(id),
    description VARCHAR(255) NOT NULL,
    inventory_code VARCHAR(100),
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 1,
    unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_taxable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
