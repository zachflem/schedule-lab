import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { SiteDocket, AssetMetric, Hazard, DocketLineItem, SignatureMetadata, PreStartSafetyCheck, DocumentImage } from '@/shared/validation/schemas';

interface CustomerContact {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  role?: string;
}

/** Shape returned by GET /api/jobs/:id */
interface JobData {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_contacts?: CustomerContact[];
  site_contact_name?: string;
  site_contact_email?: string;
  site_contact_phone?: string;
  project_name?: string;
  status_id: string;
  location?: string;
  job_brief?: string;
  asset_requirement?: string;
  resources: {
    id: string;
    resource_type: 'Asset' | 'Personnel';
    asset_id?: string;
    asset_name?: string;
    personnel_id?: string;
    personnel_name?: string;
    qualification_name?: string;
    rate_type?: string;
    rate_amount: number;
    qty: number;
    total: number;
  }[];
}

/** Shape returned by GET /api/asset-types */
interface AssetTypeData {
  id: string;
  name: string;
  checklist_questions: string[];
  extension_schema: unknown;
}

/** Shape returned by GET /api/assets/:id */
interface AssetData {
  id: string;
  name: string;
  asset_type_name: string;
  current_machine_hours: number;
  current_odometer: number;
}

export interface DocketFormState {
  job: JobData | null;
  assetTypes: AssetTypeData[];
  jobAssets: AssetData[];

  date: string;
  time_leave_yard: string;
  time_arrive_site: string;
  time_leave_site: string;
  time_return_yard: string;
  break_duration_minutes: number;

  safetyCheck: PreStartSafetyCheck;
  hazards: Hazard[];
  assetMetrics: AssetMetric[];
  jobDescriptionActual: string;
  lineItems: DocketLineItem[];
  documentImages: DocumentImage[];
  signatures: SignatureMetadata[];

  isLocked: boolean;
  docketStatus: string;
  dispatcherNotes: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  existingDocketId: string | null;
}

const today = () => new Date().toISOString().split('T')[0];

export function useDocket(jobId: string | null) {
  const [state, setState] = useState<DocketFormState>({
    job: null,
    assetTypes: [],
    jobAssets: [],
    date: today(),
    time_leave_yard: '',
    time_arrive_site: '',
    time_leave_site: '',
    time_return_yard: '',
    break_duration_minutes: 0,
    safetyCheck: { checks: {}, commMethods: [], weightUnit: 't' },
    hazards: [],
    assetMetrics: [],
    jobDescriptionActual: '',
    lineItems: [],
    documentImages: [],
    signatures: [],
    isLocked: false,
    docketStatus: 'uncompleted',
    dispatcherNotes: null,
    loading: true,
    saving: false,
    error: null,
    existingDocketId: null,
  });

  // Load job + assets + existing docket
  useEffect(() => {
    if (!jobId) {
      setState(s => ({ ...s, loading: false, error: 'No job ID provided' }));
      return;
    }

    async function loadData() {
      try {
        const [job, assetTypes] = await Promise.all([
          api.get<JobData>(`/jobs/${jobId}`),
          api.get<AssetTypeData[]>('/asset-types'),
        ]);

        // Load asset details for each asset resource
        const assetResources = job.resources.filter((r: any) => r.resource_type === 'Asset' && r.asset_id);
        const jobAssets = await Promise.all(
          assetResources.map((r: any) => api.get<AssetData>(`/assets/${r.asset_id}`))
        );

        // Build initial asset metrics from job assets
        const assetMetrics: AssetMetric[] = jobAssets.map((a: AssetData) => {
          const assetType = assetTypes.find((at: AssetTypeData) => at.name === a.asset_type_name);
          return {
            asset_id: a.id,
            asset_name: a.name,
            asset_type_name: a.asset_type_name,
            checklist_questions: assetType?.checklist_questions ?? [],
            start_odometer: String(a.current_odometer || ''),
            start_engine_lower: String(a.current_machine_hours || ''),
            start_engine_upper: '',
            end_odometer: '',
            end_engine_lower: '',
            end_engine_upper: '',
          };
        });

        // Build initial line items from job resources
        const lineItems: DocketLineItem[] = job.resources.map((r: any) => ({
          asset_id: r.asset_id ?? null,
          personnel_id: r.personnel_id ?? null,
          description: r.asset_name || r.personnel_name || r.qualification_name || 'Resource',
          inventory_code: 'AD-HOC',
          quantity: r.qty,
          unit_rate: r.rate_amount,
          is_taxable: true,
        }));

        // Check for existing docket
        const dockets = await api.get<{ id: string; is_locked: number }[]>(
          `/dockets?job_id=${jobId}`
        );

        if (dockets.length > 0) {
          // Load existing docket
          const existing = await api.get<any>(`/dockets/${dockets[0].id}`);
          setState(s => ({
            ...s,
            job,
            assetTypes,
            jobAssets,
            date: existing.date || today(),
            time_leave_yard: existing.time_leave_yard || '',
            time_arrive_site: existing.time_arrive_site || '',
            time_leave_site: existing.time_leave_site || '',
            time_return_yard: existing.time_return_yard || '',
            break_duration_minutes: existing.break_duration_minutes || 0,
            safetyCheck: existing.pre_start_safety_check
              ? (typeof existing.pre_start_safety_check === 'string'
                  ? JSON.parse(existing.pre_start_safety_check)
                  : existing.pre_start_safety_check)
              : { checks: {}, commMethods: [], weightUnit: 't' },
            hazards: existing.hazards
              ? (typeof existing.hazards === 'string' ? JSON.parse(existing.hazards) : existing.hazards)
              : [],
            assetMetrics: existing.asset_metrics
              ? (typeof existing.asset_metrics === 'string'
                  ? JSON.parse(existing.asset_metrics)
                  : existing.asset_metrics)
              : assetMetrics,
            jobDescriptionActual: existing.job_description_actual || '',
            lineItems: existing.line_items?.length ? existing.line_items.map((li: any) => ({
              ...li,
              is_taxable: !!li.is_taxable,
            })) : lineItems,
            documentImages: existing.document_images
              ? (typeof existing.document_images === 'string'
                  ? JSON.parse(existing.document_images)
                  : existing.document_images)
              : [],
            signatures: existing.signatures
              ? (typeof existing.signatures === 'string'
                  ? JSON.parse(existing.signatures)
                  : existing.signatures)
              : [],
            isLocked: !!existing.is_locked,
            docketStatus: existing.docket_status || 'uncompleted',
            dispatcherNotes: existing.dispatcher_notes || null,
            existingDocketId: existing.id,
            loading: false,
          }));
        } else {
          setState(s => ({
            ...s, job, assetTypes, jobAssets, assetMetrics, lineItems, loading: false,
          }));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setState(s => ({ ...s, loading: false, error: message }));
      }
    }

    loadData();
  }, [jobId]);

  const update = useCallback(<K extends keyof DocketFormState>(key: K, value: DocketFormState[K]) => {
    setState(s => {
      const next = { ...s, [key]: value };

      // When yard times or break change, auto-populate line item quantities
      if (key === 'time_leave_yard' || key === 'time_return_yard' || key === 'break_duration_minutes') {
        const leaveYard = key === 'time_leave_yard' ? (value as string) : s.time_leave_yard;
        const returnYard = key === 'time_return_yard' ? (value as string) : s.time_return_yard;
        const breakMins = key === 'break_duration_minutes' ? (value as number) : s.break_duration_minutes;

        if (leaveYard && returnYard) {
          const breakMs = (breakMins || 0) * 60 * 1000;
          const hours = Math.max(0, (new Date(returnYard).getTime() - new Date(leaveYard).getTime() - breakMs) / (1000 * 60 * 60));
          next.lineItems = s.lineItems.map(li => ({ ...li, quantity: Math.round(hours * 4) / 4 }));
        }
      }

      return next;
    });
  }, []);

  const saveDocket = useCallback(async (lock: boolean) => {
    if (!state.job) return;

    setState(s => ({ ...s, saving: true, error: null }));

    const nowIso = new Date().toISOString();
    const payload: Partial<SiteDocket> = {
      job_id: state.job.id,
      date: state.date,
      time_leave_yard: state.time_leave_yard || nowIso,
      time_arrive_site: state.time_arrive_site || null,
      time_leave_site: state.time_leave_site || null,
      time_return_yard: state.time_return_yard || nowIso,
      operator_hours: calcOperatorHours(state),
      machine_hours: calcMachineHours(state),
      break_duration_minutes: state.break_duration_minutes,
      pre_start_safety_check: state.safetyCheck,
      hazards: state.hazards,
      asset_metrics: state.assetMetrics,
      job_description_actual: state.jobDescriptionActual,
      document_images: state.documentImages,
      signatures: state.signatures,
      is_locked: lock,
      locked_at: lock ? nowIso : null,
      locked_by: lock ? 'current-user' : null,
      line_items: state.lineItems,
    };

    try {
      if (state.existingDocketId) {
        await api.put(`/dockets/${state.existingDocketId}`, payload);
      } else {
        const { id } = await api.post<{ id: string }>('/dockets', payload);
        setState(s => ({ ...s, existingDocketId: id, docketStatus: lock ? 'completed' : 'draft' }));
      }
      if (lock) {
        setState(s => ({ ...s, isLocked: true, docketStatus: 'completed' }));
      }
      setState(s => ({ ...s, saving: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save docket';
      setState(s => ({ ...s, saving: false, error: message }));
    }
  }, [state]);

  return { state, update, saveDocket };
}

function calcOperatorHours(s: DocketFormState): number {
  if (!s.time_leave_yard || !s.time_return_yard) return 0;
  const leave = new Date(s.time_leave_yard).getTime();
  const ret = new Date(s.time_return_yard).getTime();
  const breakMs = (s.break_duration_minutes || 0) * 60 * 1000;
  return Math.max(0, (ret - leave - breakMs) / (1000 * 60 * 60));
}

function calcMachineHours(s: DocketFormState): number {
  if (!s.time_arrive_site || !s.time_leave_site) return 0;
  const arrive = new Date(s.time_arrive_site).getTime();
  const leave = new Date(s.time_leave_site).getTime();
  const breakMs = (s.break_duration_minutes || 0) * 60 * 1000;
  return Math.max(0, (leave - arrive - breakMs) / (1000 * 60 * 60));
}
