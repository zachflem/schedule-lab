"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TenantSettings {
    company_name: string;
    logo_url: string;
    primary_color: string;
}

interface MobileDocketProps {
    jobId: string;
}

interface AssetMetric {
    asset_id: string;
    asset_name: string;
    start_odometer: string;
    start_engine_lower: string;
    start_engine_upper: string;
    end_odometer: string;
    end_engine_lower: string;
    end_engine_upper: string;
    asset_type_name?: string;
    checklist_questions?: string[];
}

interface Hazard {
    detail: string;
    control: string;
}

interface SignatureEntry {
    name: string;
    type: string;
    blob: string; // Base64 png
}

interface LineItem {
    id?: string;
    docket_id?: string;
    asset_id?: string | null;
    personnel_id?: string | null;
    description: string;
    inventory_code: string;
    quantity: number;
    unit_rate: number;
    is_taxable: boolean;
}

export function MobileDocket({ jobId }: MobileDocketProps) {
    const [branding, setBranding] = useState<TenantSettings | null>(null);
    const [jobData, setJobData] = useState<any>(null);
    const [assets, setAssets] = useState<AssetMetric[]>([]);
    const [allocatedPersonnel, setAllocatedPersonnel] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCrane, setHasCrane] = useState(false);

    // Section 3: Pre-Lift Safety Check
    const [estWeight, setEstWeight] = useState("");
    const [weightUnit, setWeightUnit] = useState("t"); // kg or t
    const [estRadius, setEstRadius] = useState("");
    const [craneCapacity, setCraneCapacity] = useState("");
    const [commMethods, setCommMethods] = useState<string[]>([]);
    const [safetyChecks, setSafetyChecks] = useState<Record<string, string>>({});
    const [hazards, setHazards] = useState<Hazard[]>([]);

    // Section 4 & 6: Times
    const [timeLeaveYard, setTimeLeaveYard] = useState("");
    const [timeArriveSite, setTimeArriveSite] = useState("");
    const [timeLeaveSite, setTimeLeaveSite] = useState("");
    const [timeReturnYard, setTimeReturnYard] = useState("");
    const [breakDuration, setBreakDuration] = useState("");

    // Section 5.5: Billable Line Items
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Section 5: Operational Resource Capture
    const [jobDescriptionActual, setJobDescriptionActual] = useState("");

    // Section 7: Signatures
    const [signatures, setSignatures] = useState<SignatureEntry[]>([]);

    const [isLocked, setIsLocked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchInitialData() {
            setIsLoading(true);
            // Branding
            const { data: bData } = await createClient().from("platform_settings").select("*").eq("id", "global").single();
            if (bData) setBranding(bData as TenantSettings);

            // Job & Customer
            const { data: jData } = await createClient()
                .from("jobs")
                .select("*, customers(*)")
                .eq("id", jobId)
                .single();

            if (jData) {
                setJobData(jData);
            }

            // Assets and Personnel from job_resources
            const { data: resData } = await createClient()
                .from("job_resources")
                .select("resource_type, asset_id, personnel_id, rate_amount, qty, assets(name, category, asset_types:asset_type_id(name, checklist_questions)), personnel(name)")
                .eq("job_id", jobId);

            if (resData) {
                // Filter unique assets
                const assetRows = resData.filter(r => r.resource_type === 'Asset' && r.asset_id);
                const uniqueAssets = Array.from(new Set(assetRows.map(r => r.asset_id))).map(id => {
                    const match = assetRows.find(r => r.asset_id === id);
                    const assetObj = match?.assets as any;
                    const typeObj = assetObj?.asset_types as any;
                    return {
                        asset_id: id,
                        asset_name: assetObj?.name || "Unknown Asset",
                        asset_type_name: typeObj?.name || "Unknown",
                        checklist_questions: typeObj?.checklist_questions || [],
                        start_odometer: "", start_engine_lower: "", start_engine_upper: "",
                        end_odometer: "", end_engine_lower: "", end_engine_upper: ""
                    }
                });
                setAssets(uniqueAssets as AssetMetric[]);
                setHasCrane(uniqueAssets.some((a: any) => a.asset_type_name?.toLowerCase().includes("crane")));

                // Filter unique personnel
                const personnelRows = resData.filter(r => r.resource_type === 'Personnel' && r.personnel_id);
                const uniquePersonnel = Array.from(new Set(personnelRows.map(r => r.personnel_id))).map(id => {
                    const match = personnelRows.find(r => r.personnel_id === id);
                    return (match?.personnel as any)?.name || "Unknown Personnel";
                });
                setAllocatedPersonnel(uniquePersonnel);
            }

            // Existing Docket Check
            const { data: existingDocket } = await createClient()
                .from("site_dockets")
                .select("*")
                .eq("job_id", jobId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingDocket) {
                const toLocalTime = (isoString?: string) => {
                    if (!isoString) return "";
                    const d = new Date(isoString);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                };

                setIsLocked(existingDocket.is_locked || false);
                setEstWeight(existingDocket.pre_start_safety_check?.estWeight || "");
                setWeightUnit(existingDocket.pre_start_safety_check?.weightUnit || "t");
                setEstRadius(existingDocket.pre_start_safety_check?.estRadius || "");
                setCraneCapacity(existingDocket.pre_start_safety_check?.craneCapacity || "");
                setCommMethods(existingDocket.pre_start_safety_check?.commMethods || []);
                if (existingDocket.pre_start_safety_check?.checks) {
                    setSafetyChecks(existingDocket.pre_start_safety_check.checks);
                }
                if (existingDocket.hazards) setHazards(existingDocket.hazards);
                if (existingDocket.asset_metrics) setAssets(existingDocket.asset_metrics);

                if (existingDocket.time_leave_yard) setTimeLeaveYard(toLocalTime(existingDocket.time_leave_yard));
                if (existingDocket.time_arrive_site) setTimeArriveSite(toLocalTime(existingDocket.time_arrive_site));
                if (existingDocket.time_leave_site) setTimeLeaveSite(toLocalTime(existingDocket.time_leave_site));
                if (existingDocket.time_return_yard) setTimeReturnYard(toLocalTime(existingDocket.time_return_yard));

                setBreakDuration(existingDocket.break_duration_minutes?.toString() || "");
                setJobDescriptionActual(existingDocket.job_description_actual || "");
                if (existingDocket.signatures) setSignatures(existingDocket.signatures);

                // Fetch line items if docket exists
                const { data: linesData } = await createClient().from("docket_line_items").select("*").eq("docket_id", existingDocket.id);
                if (linesData) setLineItems(linesData);
            } else if (resData) {
                // Initialize draft line items from job resources if no docket
                const draftLines = resData.map((r: any) => ({
                    asset_id: r.asset_id,
                    personnel_id: r.personnel_id,
                    description: r.resource_type === 'Asset' ? r.assets?.name : r.personnel?.name,
                    inventory_code: r.resource_type === 'Asset' ? (r.assets?.category || r.assets?.asset_types?.name || 'ASSET') : 'LABOUR',
                    quantity: r.qty || 0,
                    unit_rate: r.rate_amount || 0,
                    is_taxable: true
                }));
                setLineItems(draftLines);
            }

            setIsLoading(false);
        }
        fetchInitialData();
    }, [jobId]);

    const handleSafetyCheckChange = (qIndex: string, val: string) => {
        setSafetyChecks(prev => ({ ...prev, [qIndex]: val }));
    };

    const toggleCommMethod = (method: string) => {
        setCommMethods(prev =>
            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
        );
    };

    const handleAssetChange = (index: number, field: keyof AssetMetric, val: string) => {
        const newAssets = [...assets];
        newAssets[index] = { ...newAssets[index], [field]: val };
        setAssets(newAssets);
    };

    const handleLineItemChange = (index: number, field: keyof LineItem, val: any) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: val };
        setLineItems(updated);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: "", inventory_code: "AD-HOC", quantity: 1, unit_rate: 0, is_taxable: true }]);
    };

    const removeLineItem = (index: number) => {
        const updated = [...lineItems];
        updated.splice(index, 1);
        setLineItems(updated);
    };

    // Calculate Capacity Percentage
    let capacityPercent = 0;
    if (estWeight && craneCapacity) {
        let weightInTons = parseFloat(estWeight);
        if (weightUnit === 'kg') weightInTons = weightInTons / 1000;
        const capacityInTons = parseFloat(craneCapacity);
        if (capacityInTons > 0 && weightInTons > 0) {
            capacityPercent = (weightInTons / capacityInTons) * 100;
        }
    }

    const handleSaveDocket = async () => {
        if (!timeLeaveYard || !timeReturnYard) {
            alert("Hard Stop: Leave Yard and Return to Yard times are required.");
            return;
        }

        if (signatures.length === 0) {
            alert("Hard Stop: At least one signature is required.");
            return;
        }

        const preStartSafety = {
            estWeight,
            weightUnit,
            estRadius,
            craneCapacity,
            capacityPercent,
            commMethods,
            checks: safetyChecks
        };

        const todayDateStr = new Date().toISOString().split("T")[0];
        const formatTs = (timeStr: string) => {
            if (!timeStr) return null;
            return new Date(`${todayDateStr}T${timeStr}:00`).toISOString();
        }

        // Calculate generic operator hours based on leave/return timeframe
        let operatorHours = 0;
        try {
            const leave = new Date(`1970-01-01T${timeLeaveYard}:00`);
            const ret = new Date(`1970-01-01T${timeReturnYard}:00`);
            let diff = (ret.getTime() - leave.getTime()) / (1000 * 60 * 60);
            if (diff < 0) diff += 24;
            operatorHours = parseFloat(diff.toFixed(2));
        } catch (e) { }

        const payload = {
            job_id: jobId,
            date: todayDateStr,
            time_leave_yard: formatTs(timeLeaveYard),
            time_arrive_site: formatTs(timeArriveSite),
            time_leave_site: formatTs(timeLeaveSite),
            time_return_yard: formatTs(timeReturnYard),
            operator_hours: operatorHours,
            pre_start_safety_check: preStartSafety,
            hazards: hazards,
            asset_metrics: assets,
            break_duration_minutes: parseInt(breakDuration || "0"),
            job_description_actual: jobDescriptionActual,
            signatures: signatures,
            is_locked: true,
        };

        setIsSaving(true);
        try {
            const { data: docketData, error: docketError } = await createClient().from("site_dockets").insert([payload]).select().single();
            if (docketError) throw docketError;

            if (docketData && lineItems.length > 0) {
                const linesToSave = lineItems.map(item => ({
                    docket_id: docketData.id,
                    asset_id: item.asset_id || null,
                    personnel_id: item.personnel_id || null,
                    description: item.description,
                    inventory_code: item.inventory_code,
                    quantity: item.quantity,
                    unit_rate: item.unit_rate,
                    is_taxable: item.is_taxable,
                }));
                const { error: linesError } = await createClient().from("docket_line_items").insert(linesToSave);
                if (linesError) console.error("Failed to save line items:", linesError);
            }

            const { error: jobError } = await createClient().from("jobs").update({ status_id: "Completed" }).eq("id", jobId);
            if (jobError) throw jobError;

            setIsLocked(true);
            alert("Docket Signed and Locked Successfully.");
        } catch (error: any) {
            alert("Failed to save docket: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading Docket Data...</div>;

    const currentPrimaryColor = branding?.primary_color || '#2563eb';

    return (
        <div className="max-w-xl mx-auto bg-gray-50 min-h-[100dvh]">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: currentPrimaryColor }}>
                        {branding?.company_name || "Site"} Docket
                    </h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">Ref: {jobId.slice(0, 8)}</p>
                </div>
                {branding?.logo_url && (
                    <img src={branding.logo_url} alt="Logo" className="h-10 object-contain" />
                )}
            </div>

            <div className="p-4 space-y-6">

                {/* SECTION 1: Customer Details */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">1. Customer Details</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Company:</span> {jobData?.customers?.name || "N/A"}</p>
                        <p><span className="font-semibold">Contact:</span> {jobData?.customers?.contact_details?.name || "N/A"}</p>
                        <p><span className="font-semibold">Phone:</span> {jobData?.customers?.phone || jobData?.customers?.contact_details?.phone || "N/A"}</p>
                        <p><span className="font-semibold">Email:</span> {jobData?.customers?.email || "N/A"}</p>
                    </div>
                </section>

                {/* SECTION 2: Job Details */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">2. Job Details</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Location:</span> {jobData?.location || "TBD"}</p>
                        <div>
                            <span className="font-semibold block mb-1">Description:</span>
                            <div className="bg-gray-50 p-2 rounded text-gray-600 italic">
                                {jobData?.job_brief || "No description provided."}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Safety Checklist */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">3. Safety Checklist</h3>

                    <div className="space-y-4">
                        {/* Conditionally Render Crane Specifics */}
                        {hasCrane && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-900">Est. Load Weight</label>
                                        <div className="flex">
                                            <input type="number" value={estWeight} onChange={(e) => setEstWeight(e.target.value)} disabled={isLocked} className="w-full rounded-l-md border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                                            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} disabled={isLocked} className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-md px-2 text-xs text-gray-900">
                                                <option value="t">t</option>
                                                <option value="kg">kg</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-900">Est. Load Radius (m)</label>
                                        <input type="number" value={estRadius} onChange={(e) => setEstRadius(e.target.value)} disabled={isLocked} className="w-full rounded-md border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-900">Crane Capacity @ Radius (t)</label>
                                        <input type="number" value={craneCapacity} onChange={(e) => setCraneCapacity(e.target.value)} disabled={isLocked} className="w-full rounded-md border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-900">Lift Capacity Used</label>
                                        <div className={cn("w-full rounded-md border text-sm p-2 font-bold text-center", capacityPercent > 90 ? "bg-red-50 text-red-700 border-red-200" : capacityPercent > 75 ? "bg-orange-50 text-orange-700 border-orange-200" : capacityPercent > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200")}>
                                            {capacityPercent > 0 ? capacityPercent.toFixed(1) + "%" : "-"}
                                        </div>
                                    </div>
                                </div>

                                {capacityPercent > 0 && (
                                    <div className={cn("p-3 rounded border text-sm font-semibold text-center mt-2", capacityPercent > 75 ? "bg-orange-50 text-orange-800 border-orange-200" : "bg-green-50 text-green-800 border-green-200")}>
                                        {capacityPercent > 75 ? "An engineered lift study may be required to proceed" : "Proceed as planned"}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <label className="block text-xs font-semibold mb-2 text-gray-900">Established Communications</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["Radio", "Hand Signals", "Whistles", "Verbal"].map(m => (
                                            <button key={m} onClick={() => toggleCommMethod(m)} disabled={isLocked} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", commMethods.includes(m) ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-300 text-gray-600")}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="mt-6 space-y-4 border-t pt-4">
                            <h4 className="text-sm font-semibold text-gray-800">Safety Checklist</h4>

                            {assets.filter(a => a.checklist_questions && a.checklist_questions.length > 0).length === 0 ? (
                                <p className="text-sm font-bold text-gray-500 italic mb-4 bg-gray-50 p-3 rounded border text-center">No safety checklists required for these assets.</p>
                            ) : (
                                assets.filter(a => a.checklist_questions && a.checklist_questions.length > 0).map(asset => (
                                    <div key={asset.asset_id} className="mb-6">
                                        <h5 className="text-xs font-bold text-blue-800 uppercase mb-3 bg-blue-50 py-1 px-2 rounded inline-block">{asset.asset_name} ({asset.asset_type_name})</h5>
                                        <div className="space-y-3">
                                            {asset.checklist_questions!.map((qText, qIdx) => {
                                                const qKey = `${asset.asset_id}_q${qIdx}`;
                                                return (
                                                    <div key={qKey} className="bg-gray-50 p-3 rounded border border-gray-100">
                                                        <p className="text-xs font-medium text-gray-800 mb-2">{qText}</p>
                                                        <div className="flex gap-2">
                                                            {["YES", "NO", "N/A"].map(opt => (
                                                                <button key={opt} onClick={() => handleSafetyCheckChange(qKey, opt)} disabled={isLocked} className={cn("flex-1 py-1.5 text-xs font-bold rounded border", safetyChecks[qKey] === opt ? (opt === 'YES' ? 'bg-green-100 border-green-500 text-green-800' : opt === 'NO' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-gray-200 border-gray-500 text-gray-800') : "bg-white border-gray-300 text-gray-500")}>
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Hazards</h4>
                            {isLocked && hazards.length === 0 && (
                                <p className="text-sm font-bold text-gray-500 italic mb-4 bg-gray-50 p-3 rounded border text-center">No Hazards Recorded.</p>
                            )}
                            {hazards.map((h, i) => (
                                <div key={i} className="mb-3 p-3 bg-red-50 border border-red-100 rounded relative">
                                    {!isLocked && (
                                        <div className="absolute top-2 right-2 flex gap-3">
                                            <button onClick={() => {
                                                const newDetail = prompt("Edit Hazard Detail:", h.detail);
                                                if (newDetail === null) return;
                                                const newControl = prompt("Edit Proposed Controls:", h.control);
                                                if (newControl === null) return;
                                                const newHazards = [...hazards];
                                                newHazards[i] = { detail: newDetail, control: newControl };
                                                setHazards(newHazards);
                                            }} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Edit</button>
                                            <button onClick={() => {
                                                if (confirm("Remove this hazard?")) {
                                                    const newHazards = [...hazards];
                                                    newHazards.splice(i, 1);
                                                    setHazards(newHazards);
                                                }
                                            }} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                                        </div>
                                    )}
                                    <p className="text-xs font-bold text-red-800 mb-1 pr-24">Hazard:</p>
                                    <p className="text-sm text-red-900 mb-2 pr-24">{h.detail}</p>
                                    <p className="text-xs font-bold text-green-800 mb-1 pr-24">Controls:</p>
                                    <p className="text-sm text-green-900 pr-24">{h.control}</p>
                                </div>
                            ))}
                            {!isLocked && (
                                <button onClick={() => {
                                    const detail = prompt("Enter Hazard Detail:");
                                    if (!detail) return;
                                    const control = prompt("Enter Proposed Controls:");
                                    if (detail && control) {
                                        setHazards([...hazards, { detail, control }]);
                                    }
                                }} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                    + Add Hazard
                                </button>
                            )}

                            {(() => {
                                const expectedChecklistKeys = assets.flatMap(a => (a.checklist_questions || []).map((_, qIdx) => `${a.asset_id}_q${qIdx}`));
                                const safetyHasNo = Object.values(safetyChecks).some(v => v === "NO");
                                const safetyAllAnswered = expectedChecklistKeys.length > 0 && expectedChecklistKeys.every(k => safetyChecks[k]);
                                const safetyHasHazards = hazards.length > 0;

                                if (!safetyAllAnswered && !safetyHasHazards && !safetyHasNo) return null;

                                return (
                                    <div className={cn("p-3 rounded border text-sm font-semibold text-center mt-4",
                                        safetyHasNo ? "bg-red-50 text-red-800 border-red-200" :
                                            safetyHasHazards ? "bg-orange-50 text-orange-800 border-orange-200" :
                                                "bg-green-50 text-green-800 border-green-200"
                                    )}>
                                        {safetyHasNo ? "A full risk assessment may be required!" :
                                            safetyHasHazards ? "Ensure control measures are in place and crew has been notified of hazards" :
                                                "Proceed as planned"}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Start Times */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">4. Start Times & Metrics</h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-900">Leave Yard</label>
                            <input type="time" value={timeLeaveYard} onChange={e => setTimeLeaveYard(e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-900">Arrive Onsite</label>
                            <input type="time" value={timeArriveSite} onChange={e => setTimeArriveSite(e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                        </div>
                    </div>

                    {assets.length > 0 && (
                        <div className="space-y-4 border-t pt-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase">Asset Start Metrics</h4>
                            {assets.map((asset, i) => (
                                <div key={asset.asset_id} className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <p className="text-sm font-bold text-gray-800 mb-2">{asset.asset_name}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Odometer (km)</label>
                                            <input type="number" value={asset.start_odometer} onChange={e => handleAssetChange(i, "start_odometer", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-800 mb-1">Eng Hrs (Lower)</label>
                                            <input type="number" value={asset.start_engine_lower} onChange={e => handleAssetChange(i, "start_engine_lower", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5 text-gray-900 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-800 mb-1">Eng Hrs (Upper)</label>
                                            <input type="number" value={asset.start_engine_upper} onChange={e => handleAssetChange(i, "start_engine_upper", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5 text-gray-900 bg-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* SECTION 5: Operational Resource Capture */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">5. Job Details (As Completed)</h3>
                    <textarea
                        value={jobDescriptionActual}
                        onChange={e => setJobDescriptionActual(e.target.value)}
                        disabled={isLocked}
                        rows={4}
                        placeholder="Briefly describe the work completed on site..."
                        className="w-full rounded border-gray-300 border text-sm p-3 bg-gray-50 focus:bg-white transition text-gray-900"
                    />
                </section>

                {/* SECTION 6: Finish Times */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">6. Finish Times & Metrics</h3>

                    <div className="mb-4">
                        <label className="block text-xs font-semibold mb-1 text-gray-900">Time spent off task / break (minutes)</label>
                        <select value={breakDuration} onChange={e => setBreakDuration(e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-2 bg-white text-gray-900">
                            <option value="0">0 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-900">Leave Site</label>
                            <input type="time" value={timeLeaveSite} onChange={e => setTimeLeaveSite(e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-900">Arrive @ Yard</label>
                            <input type="time" value={timeReturnYard} onChange={e => setTimeReturnYard(e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-2 text-gray-900 bg-white" />
                        </div>
                    </div>

                    {assets.length > 0 && (
                        <div className="space-y-4 border-t pt-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase">Asset End Metrics</h4>
                            {assets.map((asset, i) => (
                                <div key={asset.asset_id} className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <p className="text-sm font-bold text-gray-800 mb-2">{asset.asset_name}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-800 mb-1">Odometer (km)</label>
                                            <input type="number" value={asset.end_odometer} onChange={e => handleAssetChange(i, "end_odometer", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5 text-gray-900 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-800 mb-1">Eng Hrs (Lower)</label>
                                            <input type="number" value={asset.end_engine_lower} onChange={e => handleAssetChange(i, "end_engine_lower", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5 text-gray-900 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-800 mb-1">Eng Hrs (Upper)</label>
                                            <input type="number" value={asset.end_engine_upper} onChange={e => handleAssetChange(i, "end_engine_upper", e.target.value)} disabled={isLocked} className="w-full rounded border-gray-300 border text-sm p-1.5 text-gray-900 bg-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* NEW SECTION 6.5: Billable Line Items */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">6.5 Billable Line Items</h3>
                    <p className="text-xs text-gray-500 mb-4">Adjust hours and rates for final billing based on the times above.</p>

                    <div className="space-y-3">
                        {lineItems.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 border rounded-md p-3 relative">
                                {!isLocked && (
                                    <button onClick={() => removeLineItem(idx)} className="absolute top-2 right-2 text-red-500 font-bold hover:text-red-700">×</button>
                                )}
                                <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Item Description</label>
                                        <input type="text" value={item.description} onChange={e => handleLineItemChange(idx, "description", e.target.value)} disabled={isLocked} className="w-full border rounded text-sm p-1" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Qty / Hrs</label>
                                        <input type="number" step="0.25" value={item.quantity} onChange={e => handleLineItemChange(idx, "quantity", parseFloat(e.target.value) || 0)} disabled={isLocked} className="w-full border rounded text-sm p-1" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Rate ($)</label>
                                        <input type="number" step="0.01" value={item.unit_rate} onChange={e => handleLineItemChange(idx, "unit_rate", parseFloat(e.target.value) || 0)} disabled={isLocked} className="w-full border rounded text-sm p-1" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" checked={item.is_taxable} onChange={e => handleLineItemChange(idx, "is_taxable", e.target.checked)} disabled={isLocked} id={`tax-${idx}`} className="rounded border-gray-300" />
                                        <label htmlFor={`tax-${idx}`} className="text-[10px] font-bold text-gray-500 uppercase">Taxable</label>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase mr-2">Line Total:</span>
                                        <span className="font-bold text-gray-900">${(item.quantity * item.unit_rate).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {lineItems.length === 0 && (
                            <p className="text-sm font-bold text-gray-400 italic text-center p-4 border border-dashed rounded">No line items.</p>
                        )}

                        {!isLocked && (
                            <button onClick={addLineItem} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                + Add Ad-Hoc Item (e.g. Travel, Consumables)
                            </button>
                        )}
                    </div>
                </section>

                {/* NEW SECTION 7: Pre-Signoff Summary */}
                <section className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
                    <h3 className="font-bold text-blue-900 border-b border-blue-200 pb-2 mb-3">7. Job Summary</h3>
                    <div className="space-y-3 text-sm text-blue-900">
                        <div>
                            <span className="font-semibold block mb-1">Equipment Supplied:</span>
                            <ul className="list-disc pl-5">
                                {assets.length > 0 ? assets.map(a => <li key={a.asset_id}>{a.asset_name}</li>) : <li>None listed</li>}
                            </ul>
                        </div>
                        <div>
                            <span className="font-semibold block mb-1">Personnel Assigned:</span>
                            <ul className="list-disc pl-5">
                                {allocatedPersonnel.length > 0 ? allocatedPersonnel.map((p, i) => <li key={i}>{p}</li>) : <li>None listed</li>}
                            </ul>
                        </div>
                        <div className="pt-2 border-t border-blue-200 mt-2">
                            <span className="font-semibold mr-2">Total Time (Yard to Yard):</span>
                            {(() => {
                                if (timeLeaveYard && timeReturnYard) {
                                    const leave = new Date(`1970-01-01T${timeLeaveYard}:00`);
                                    const ret = new Date(`1970-01-01T${timeReturnYard}:00`);
                                    let diff = (ret.getTime() - leave.getTime()) / (1000 * 60 * 60);
                                    if (diff < 0) diff += 24;
                                    return <span className="font-bold">{diff.toFixed(2)} Hours</span>;
                                }
                                return <span className="text-blue-700 italic">Pending return time</span>;
                            })()}
                        </div>
                    </div>
                </section>

                {/* SECTION 8: Customer Sign Off */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-3">8. Customer Sign Off</h3>

                    {isLocked ? (
                        <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200 mb-4">
                            <p className="font-bold flex items-center">
                                <span className="mr-2">🔒</span> Docket Locked
                            </p>
                            <p className="text-sm mt-1">This docket has been signed and is read-only.</p>
                        </div>
                    ) : null}

                    {signatures.map((sig, idx) => (
                        <div key={idx} className="mb-4 bg-gray-50 border rounded p-3">
                            <p className="text-sm font-semibold text-gray-800">{sig.name} ({sig.type})</p>
                            <img src={sig.blob} alt="Signature" className="h-24 object-contain mix-blend-multiply mt-2" />
                        </div>
                    ))}

                    {!isLocked && (
                        <SignatureCaptureBlock
                            onSave={(name, type, blob) => setSignatures([...signatures, { name, type, blob }])}
                        />
                    )}
                </section>

                {/* Final Submit */}
                {!isLocked && (
                    <button
                        onClick={handleSaveDocket}
                        disabled={isSaving}
                        style={{ backgroundColor: currentPrimaryColor }}
                        className="w-full text-white font-bold text-lg py-4 rounded-lg shadow-md focus:outline-none transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed mb-8"
                    >
                        {isSaving ? "Saving..." : "Sign & Lock Docket"}
                    </button>
                )}

            </div>
        </div>
    );
}

// Subcomponent for isolating signature refs cleanly
function SignatureCaptureBlock({ onSave }: { onSave: (name: string, type: string, blob: string) => void }) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState("Site Representative");
    const [isActive, setIsActive] = useState(false);

    const handleConfirm = () => {
        if (!name) return alert("Please enter a name for the signatory.");
        if (sigCanvas.current?.isEmpty()) return alert("Please draw a signature.");

        const blob = sigCanvas.current?.getCanvas().toDataURL("image/png");
        if (blob) {
            onSave(name, type, blob);
            setName("");
            setIsActive(false);
        }
    };

    if (!isActive) {
        return (
            <button onClick={() => setIsActive(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition mb-2">
                + Add Signature
            </button>
        );
    }

    return (
        <div className="border border-blue-200 bg-blue-50 rounded-md p-3 mb-4">
            <h4 className="text-sm font-bold text-blue-900 mb-2">New Signature</h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <input type="text" placeholder="Signatory Name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded border-gray-300 text-sm p-2 text-gray-900 bg-white" />
                <input type="text" placeholder="Role/Title" value={type} onChange={e => setType(e.target.value)} className="w-full rounded border-gray-300 text-sm p-2 text-gray-900 bg-white" />
            </div>
            <div className="border border-gray-300 rounded bg-white overflow-hidden mb-2">
                <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{ className: "w-full h-32 cursor-crosshair", style: { touchAction: "none" } }}
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsActive(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 font-semibold rounded text-sm">Cancel</button>
                <button onClick={() => sigCanvas.current?.clear()} className="flex-1 py-2 bg-yellow-100 text-yellow-800 font-semibold rounded text-sm">Clear</button>
                <button onClick={handleConfirm} className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded text-sm">Save</button>
            </div>
        </div>
    );
}

