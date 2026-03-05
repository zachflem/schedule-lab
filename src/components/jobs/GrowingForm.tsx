"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2 } from "lucide-react";

// The strict linear progression as defined in PROJECT_MASTER.md
const STATUS_FLOW = [
    "Enquiry",
    "Quote",
    "Quote Sent",
    "Quote Accepted",
    "Job Booked",
    "Job Scheduled",
    "Allocated",
    "Site Docket",
    "Completed",
    "Invoiced",
];

interface Customer {
    id: string;
    name: string;
}

interface JobResource {
    id?: string;
    resource_type: "Asset" | "Personnel";
    asset_id?: string;
    personnel_id?: string;
    qualification_id?: string;
    rate_type?: string;
    rate_amount: number;
    qty: number;
    total: number;
    // UI Helpers
    asset_name?: string;
    personnel_name?: string;
    qualification_name?: string;
}

interface GrowingFormProps {
    open: boolean;
    onClose: () => void;
    onCloseWithSuccess?: () => void;
    jobId?: string | null; // null means new Enquiry
    customerId?: string; // Passed in if started from a Customer view
}

export function GrowingForm({ open, onClose, onCloseWithSuccess, jobId, customerId }: GrowingFormProps) {
    // Local state for the form's data payload
    const [status, setStatus] = useState<string>("Enquiry");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [availableAssets, setAvailableAssets] = useState<any[]>([]);
    const [availablePersonnel, setAvailablePersonnel] = useState<any[]>([]);
    const [qualifications, setQualifications] = useState<any[]>([]);
    const [personnelQuals, setPersonnelQuals] = useState<any[]>([]);
    const [jobResources, setJobResources] = useState<JobResource[]>([]);
    const [formData, setFormData] = useState<any>({
        customer_id: customerId || "",
        location: "",
        crane_size: "",
        po_number: "",
        job_brief: "",
        max_weight: "",
        hazards: "",
        site_access: "",
        pricing: "", // We'll keep this as a 'Total Quote' summary
        tc_accepted: false,
        approver_name: "",
        task_description: "",
        inclusions: "",
        exclusions: "",
        include_standard_terms: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Deletion State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchCustomers();
            fetchAvailableResources();
            if (jobId) {
                fetchJobData(jobId);
                fetchJobResources(jobId);
            } else {
                setStatus("Enquiry");
                setJobResources([]);
                setFormData({
                    customer_id: customerId || "",
                    location: "",
                    crane_size: "",
                    po_number: "",
                    job_brief: "",
                    max_weight: "",
                    hazards: "",
                    site_access: "",
                    pricing: "",
                    tc_accepted: false,
                    approver_name: "",
                    task_description: "",
                    inclusions: "",
                    exclusions: "",
                    include_standard_terms: true,
                });
            }
        }
    }, [open, jobId, customerId]);

    async function fetchCustomers() {
        const { data } = await createClient().from("customers").select("id, name").order("name");
        if (data) setCustomers(data);
    }

    async function fetchAvailableResources() {
        const { data: assets } = await createClient().from("assets").select("*").order("name");
        const { data: personnel } = await createClient().from("personnel").select("id, name").order("name");
        const { data: quals } = await createClient().from("qualifications").select("*").order("name");
        const { data: pQuals } = await createClient().from("personnel_qualifications").select("*");

        if (assets) setAvailableAssets(assets);
        if (personnel) setAvailablePersonnel(personnel);
        if (quals) setQualifications(quals);
        if (pQuals) setPersonnelQuals(pQuals);
    }

    async function fetchJobResources(id: string) {
        const { data } = await createClient()
            .from("job_resources")
            .select(`
                *,
                assets ( name ),
                personnel ( name ),
                qualifications ( name )
            `)
            .eq("job_id", id);

        if (data) {
            const mapped = data.map(r => ({
                ...r,
                asset_name: r.assets?.name,
                personnel_name: r.personnel?.name,
                qualification_name: r.qualifications?.name
            }));
            setJobResources(mapped);
        }
    }

    async function fetchJobData(id: string) {
        const { data } = await createClient().from("jobs").select("*").eq("id", id).single();
        if (data) {
            setFormData(data);
            setStatus(data.status_id);
        }
    }

    // Determines what section of the form renders based on current status
    const currentStepIndex = STATUS_FLOW.indexOf(status);

    const addResource = (type: "Asset" | "Personnel") => {
        console.log(`[DEBUG] addResource clicked. Type: ${type}, Current Resources length:`, jobResources.length);
        const newRes: JobResource = {
            resource_type: type,
            rate_amount: 0,
            qty: 1,
            total: 0
        };
        console.log(`[DEBUG] Adding new resource:`, newRes);
        setJobResources([...jobResources, newRes]);
        console.log(`[DEBUG] Finished setJobResources. Current Step Index:`, currentStepIndex, "Status:", status);
    };

    const removeResource = (index: number) => {
        const updated = [...jobResources];
        updated.splice(index, 1);
        setJobResources(updated);
    };

    const updateResource = (index: number, updates: Partial<JobResource>) => {
        const updated = [...jobResources];
        const res = { ...updated[index], ...updates };

        // Handle rate auto-filling for assets
        if (updates.asset_id) {
            const asset = availableAssets.find(a => a.id === updates.asset_id);
            if (asset) {
                res.asset_name = asset.name;
                // Default to hourly if available
                res.rate_type = "Hourly";
                res.rate_amount = asset.rate_hourly || 0;
            }
        }

        if (updates.personnel_id) {
            const person = availablePersonnel.find(p => p.id === updates.personnel_id);
            if (person) res.personnel_name = person.name;
        }

        if (updates.qualification_id) {
            const qual = qualifications.find(q => q.id === updates.qualification_id);
            if (qual) {
                res.qualification_name = qual.name;
                res.rate_amount = qual.rate_hourly || 0;
                res.rate_type = "Hourly";
                // Reset personnel if qualification changes to ensure compliance
                res.personnel_id = "";
                res.personnel_name = "";
            }
        }

        if (updates.rate_type && res.asset_id) {
            const asset = availableAssets.find(a => a.id === res.asset_id);
            if (asset) {
                switch (updates.rate_type) {
                    case "Hourly": res.rate_amount = asset.rate_hourly || 0; break;
                    case "Dry Hire": res.rate_amount = asset.rate_dry_hire || 0; break;
                }
            }
        }

        if (updates.rate_type && res.qualification_id) {
            const qual = qualifications.find(q => q.id === res.qualification_id);
            if (qual) {
                switch (updates.rate_type) {
                    case "Hourly": res.rate_amount = qual.rate_hourly || 0; break;
                    case "After Hours": res.rate_amount = qual.rate_after_hours || 0; break;
                }
            }
        }

        res.total = (res.rate_amount || 0) * (res.qty || 0);
        updated[index] = res;
        setJobResources(updated);
    };

    const handleSaveAndAdvance = async (skipQuote: boolean | React.MouseEvent = false) => {
        const isSkipping = typeof skipQuote === 'boolean' ? skipQuote : false;
        setIsSaving(true);
        let nextStatus = status;

        // Basic Gates / Hard Stop Logic Implementation (MVP)
        if (status === "Enquiry") {
            if (!formData.customer_id || !formData.location || !formData.crane_size) {
                alert("Hard Stop: Customer, Location, and Asset Requirements are required to save an Enquiry.");
                setIsSaving(false);
                return;
            }
            nextStatus = "Quote";
            // Default task_description from job_brief on first transition to Quote
            if (!formData.task_description) {
                formData.task_description = formData.job_brief;
            }
        } else if (status === "Quote") {
            // pricing is now calculated from resources
            const total = jobResources.reduce((acc, curr) => acc + (curr.total || 0), 0);
            if (total === 0) {
                alert("Hard Stop: Please add at least one resource with a rate to proceed.");
                setIsSaving(false);
                return;
            }
            if (isSkipping) {
                nextStatus = "Job Booked";
                formData.tc_accepted = true;
                if (!formData.approver_name) {
                    formData.approver_name = "Internal Bypass";
                }
            } else {
                nextStatus = "Quote Sent";
            }
        } else if (status === "Quote Sent") {
            nextStatus = "Quote Accepted";
        } else if (status === "Quote Accepted") {
            if (!formData.tc_accepted || !formData.approver_name) {
                alert("Hard Stop: Customer must accept T&Cs and provide an Approver Name.");
                setIsSaving(false);
                return;
            }
            nextStatus = "Job Booked";
        }

        const quoteTotal = jobResources.reduce((acc, curr) => acc + (curr.total || 0), 0);

        const payload = {
            ...formData,
            max_weight: formData.max_weight === "" ? null : formData.max_weight,
            pricing: quoteTotal > 0 ? quoteTotal : formData.pricing,
            status_id: nextStatus,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await createClient()
            .from("jobs")
            .upsert([
                {
                    ...(jobId ? { id: jobId } : {}),
                    ...payload,
                }
            ])
            .select();

        if (error) {
            alert("Error saving job: " + error.message);
            setIsSaving(false);
            return;
        }

        const savedJobId = jobId || data?.[0]?.id;

        // Sync resources
        if (savedJobId) {
            // Simple approach: Delete and re-insert for MVP
            await createClient().from("job_resources").delete().eq("job_id", savedJobId);
            if (jobResources.length > 0) {
                const resourcesToSave = jobResources.map((res) => {
                    const { id, asset_name, personnel_name, qualification_name, ...rest } = res;
                    return {
                        ...rest,
                        job_id: savedJobId,
                        asset_id: rest.asset_id || null,
                        personnel_id: rest.personnel_id || null,
                        qualification_id: rest.qualification_id || null,
                    };
                });
                const { error: resError } = await createClient().from("job_resources").insert(resourcesToSave);
                if (resError) {
                    console.error("Failed to insert resources:", resError);
                    alert("Failed to save resources: " + resError.message);
                }
            }
        }

        setIsSaving(false);

        if (!error) {
            setStatus(nextStatus);
            if (onCloseWithSuccess) {
                onCloseWithSuccess();
            } else {
                onClose();
            }
        }
    };

    const quoteTotal = jobResources.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const handleDeleteJob = async () => {
        if (!jobId) return;
        setIsDeleting(true);

        try {
            // 1. Delete dockets
            await createClient().from("dockets").delete().eq("job_id", jobId);
            // 2. Delete allocations
            await createClient().from("allocations").delete().eq("job_id", jobId);
            // 3. Delete job_schedules
            await createClient().from("job_schedules").delete().eq("job_id", jobId);
            // 4. Delete job_resources
            await createClient().from("job_resources").delete().eq("job_id", jobId);
            // 5. Delete job
            const { error } = await createClient().from("jobs").delete().eq("id", jobId);

            if (error) throw error;

            setIsDeleteDialogOpen(false);
            if (onCloseWithSuccess) {
                onCloseWithSuccess();
            } else {
                onClose();
            }
        } catch (error: any) {
            alert("Error deleting job: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Job Record: {status}</DialogTitle>
                        <DialogDescription>
                            The Growing Form expands as the job progresses through its lifecycle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {/* ENQUIRY SECTION (Always visible) */}
                        <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-gray-900 text-sm">1. Enquiry Details</h3>
                                {currentStepIndex > 0 && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded">Locked</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                                    <select
                                        value={formData.customer_id}
                                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        disabled={currentStepIndex > 0}
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        disabled={currentStepIndex > 0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Asset Requirements</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 20T Franna"
                                        value={formData.crane_size}
                                        onChange={(e) => setFormData({ ...formData, crane_size: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        disabled={currentStepIndex > 0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">PO Number (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PO-12345"
                                        value={formData.po_number || ""}
                                        onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        disabled={currentStepIndex > 0}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Job Brief (Hazards, Access)</label>
                                    <textarea
                                        rows={2}
                                        value={formData.job_brief}
                                        onChange={(e) => setFormData({ ...formData, job_brief: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        disabled={currentStepIndex > 0}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* QUOTE SECTION (Visible if status >= Quote) */}
                        {currentStepIndex >= 1 && (
                            <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-900 text-sm">2. Quoting (Resources & Rates)</h3>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => addResource("Asset")}
                                            disabled={currentStepIndex >= 2}
                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center"
                                        >
                                            + Asset
                                        </button>
                                        <button
                                            onClick={() => addResource("Personnel")}
                                            disabled={currentStepIndex >= 2}
                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center"
                                        >
                                            + Personnel
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {jobResources.map((res, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded border border-blue-200 grid grid-cols-12 gap-3 items-center shadow-sm">
                                            <div className="col-span-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Resource</label>
                                                {res.resource_type === "Asset" ? (
                                                    <select
                                                        value={res.asset_id || ""}
                                                        onChange={(e) => updateResource(idx, { asset_id: e.target.value })}
                                                        className="w-full text-xs p-1 border rounded"
                                                        disabled={currentStepIndex >= 2}
                                                    >
                                                        <option value="">Select Asset...</option>
                                                        {availableAssets.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <select
                                                            value={res.qualification_id || ""}
                                                            onChange={(e) => updateResource(idx, { qualification_id: e.target.value })}
                                                            className="w-full text-xs p-1 border rounded bg-blue-50"
                                                            disabled={currentStepIndex >= 2}
                                                        >
                                                            <option value="">Select Role...</option>
                                                            {qualifications.map(q => (
                                                                <option key={q.id} value={q.id}>{q.name}</option>
                                                            ))}
                                                        </select>
                                                        {res.qualification_id && (
                                                            <select
                                                                value={res.personnel_id || ""}
                                                                onChange={(e) => updateResource(idx, { personnel_id: e.target.value })}
                                                                className="w-full text-xs p-1 border rounded"
                                                                disabled={currentStepIndex >= 2}
                                                            >
                                                                <option value="">Select Person...</option>
                                                                {availablePersonnel.filter(p => {
                                                                    const qual = personnelQuals.find(pq =>
                                                                        pq.personnel_id === p.id &&
                                                                        pq.qualification_id === res.qualification_id
                                                                    );
                                                                    if (!qual) return false;
                                                                    if (!qual.expiry_date) return true;
                                                                    return new Date(qual.expiry_date) > new Date();
                                                                }).map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Hire Type</label>
                                                {res.resource_type === "Asset" ? (
                                                    <div>
                                                        <select
                                                            value={res.rate_type || ""}
                                                            onChange={(e) => updateResource(idx, { rate_type: e.target.value })}
                                                            className="w-full text-xs p-1 border rounded"
                                                            disabled={currentStepIndex >= 2}
                                                        >
                                                            <option value="Hourly">Hourly</option>
                                                            <option value="Dry Hire">Dry Hire</option>
                                                        </select>
                                                        {res.rate_type === "Hourly" && (
                                                            <div className="text-[8px] text-gray-500 mt-0.5 italic">
                                                                + AH applied after 8hrs
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <select
                                                            value={res.rate_type || ""}
                                                            onChange={(e) => updateResource(idx, { rate_type: e.target.value })}
                                                            className="w-full text-xs p-1 border rounded"
                                                            disabled={currentStepIndex >= 2 || !res.qualification_id}
                                                        >
                                                            <option value="Hourly">Hourly</option>
                                                            <option value="After Hours">After Hours</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Rate ($)</label>
                                                <input
                                                    type="number"
                                                    value={res.rate_amount}
                                                    onChange={(e) => updateResource(idx, { rate_amount: parseFloat(e.target.value) })}
                                                    className="w-full text-xs p-1 border rounded"
                                                    disabled={currentStepIndex >= 2}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Qty</label>
                                                <input
                                                    type="number"
                                                    value={res.qty}
                                                    onChange={(e) => updateResource(idx, { qty: parseFloat(e.target.value) })}
                                                    className="w-full text-xs p-1 border rounded"
                                                    disabled={currentStepIndex >= 2}
                                                />
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block">Total</label>
                                                <span className="text-sm font-bold text-gray-900">${res.total?.toFixed(2)}</span>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    onClick={() => removeResource(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    disabled={currentStepIndex >= 2}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {jobResources.length === 0 && (
                                        <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-blue-200 rounded">
                                            No resources added to this quote.
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between items-center px-1">
                                        <span className="text-sm font-semibold text-gray-700 uppercase">Estimated Quote Total:</span>
                                        <span className="text-xl font-black text-blue-700">${quoteTotal.toFixed(2)}</span>
                                    </div>

                                    {/* NEW: QUOTE TEXT DETAILS */}
                                    <div className="mt-6 space-y-4 pt-4 border-t border-blue-100">
                                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-tight">Quote Details</h4>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">Task Description</label>
                                                <textarea
                                                    rows={2}
                                                    value={formData.task_description}
                                                    onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                                                    placeholder="Defaults to Job Brief..."
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs p-2 border"
                                                    disabled={currentStepIndex >= 2}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Inclusions</label>
                                                    <textarea
                                                        rows={3}
                                                        value={formData.inclusions}
                                                        onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                                                        placeholder="List inclusions..."
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs p-2 border"
                                                        disabled={currentStepIndex >= 2}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Exclusions</label>
                                                    <textarea
                                                        rows={3}
                                                        value={formData.exclusions}
                                                        onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                                                        placeholder="List exclusions..."
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs p-2 border"
                                                        disabled={currentStepIndex >= 2}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 pt-2">
                                                <input
                                                    type="checkbox"
                                                    id="include_standard_terms"
                                                    checked={formData.include_standard_terms}
                                                    onChange={(e) => setFormData({ ...formData, include_standard_terms: e.target.checked })}
                                                    disabled={currentStepIndex >= 2}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="include_standard_terms" className="text-xs font-semibold text-gray-700">
                                                    Include Standard Hire Terms and Conditions
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* CUSTOMER PORTAL SIMULATION (Visisble if status >= Quote Sent) */}
                        {currentStepIndex >= 2 && currentStepIndex < 4 && (
                            <section className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 border-dashed">
                                <h3 className="font-semibold text-gray-900 mb-4 text-xs flex items-center">
                                    <span className="mr-2">⚙️</span> SIMULATED CUSTOMER ACTION (Portal View)
                                </h3>
                                <div className="flex items-center space-x-4 mb-4">
                                    <input
                                        type="checkbox"
                                        id="tc"
                                        checked={formData.tc_accepted}
                                        onChange={(e) => setFormData({ ...formData, tc_accepted: e.target.checked })}
                                    />
                                    <label htmlFor="tc" className="text-sm font-medium text-gray-700">I accept the Terms and Conditions</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Approver Name (Digital Lock)</label>
                                    <input
                                        type="text"
                                        value={formData.approver_name}
                                        onChange={(e) => setFormData({ ...formData, approver_name: e.target.value })}
                                        className="mt-1 block max-w-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    />
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="mt-8 flex flex-row items-center justify-between pb-4 pt-4 border-t">
                        {jobId ? (
                            <button
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" /> Delete Job
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            {status === "Quote" && (
                                <button
                                    onClick={() => {
                                        if (window.confirm("Do you wish to progress this job without sending the customer a quote?")) {
                                            handleSaveAndAdvance(true);
                                        }
                                    }}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Progress without Sending
                                </button>
                            )}
                            {jobId && !["Enquiry", "Quote", "Quote Sent"].includes(status) && (
                                <button
                                    onClick={() => window.open(`/docket?jobId=${jobId}`, '_blank')}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                                >
                                    Open Mobile Docket
                                </button>
                            )}
                            <button
                                onClick={() => handleSaveAndAdvance(false)}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." :
                                    status === "Enquiry" ? "Save & Create Quote" :
                                        status === "Quote" ? "Send Quote" :
                                            status === "Quote Sent" ? "Customer Approves Quote" :
                                                "Save Progress"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDeleteJob}
                title="Delete Job"
                entityName="this job and all associated records"
                isDeleting={isDeleting}
            />
        </>
    );
}
