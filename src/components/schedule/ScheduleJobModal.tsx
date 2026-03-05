"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, User, Truck, CheckCircle } from "lucide-react";

interface ScheduleJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    onScheduled: () => void;
}

export function ScheduleJobModal({ isOpen, onClose, jobId, onScheduled }: ScheduleJobModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [job, setJob] = useState<any>(null);
    const [resources, setResources] = useState<any[]>([]);

    // Selectable options
    const [assets, setAssets] = useState<any[]>([]);
    const [personnel, setPersonnel] = useState<any[]>([]);

    // Form State
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [allocations, setAllocations] = useState<{ resourceId: string; assignedId: string }[]>([]);

    useEffect(() => {
        if (isOpen && jobId) {
            loadData();

            // Set default times (e.g., tomorrow 7 AM to 3 PM)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(7, 0, 0, 0);

            const trmEnd = new Date(tomorrow);
            trmEnd.setHours(15, 0, 0, 0);

            // Format for datetime-local
            const formatForInput = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setStartTime(formatForInput(tomorrow));
            setEndTime(formatForInput(trmEnd));
        }
    }, [isOpen, jobId]);

    async function loadData() {
        setIsLoading(true);

        const [
            { data: jobData },
            { data: resourcesData },
            { data: assetsData },
            { data: personnelData }
        ] = await Promise.all([
            createClient().from("jobs").select("*, customers(name)").eq("id", jobId).single(),
            createClient().from("job_resources").select("*").eq("job_id", jobId),
            createClient().from("assets").select("*").order("name"),
            createClient().from("personnel").select("*").order("name")
        ]);

        if (jobData) setJob(jobData);
        if (resourcesData) {
            setResources(resourcesData);
            setAllocations(resourcesData.map((r: any) => ({
                resourceId: r.id,
                // automatically assign if it was pre-selected in the quote
                assignedId: r.resource_type === 'Asset' ? (r.asset_id || "") : (r.personnel_id || "")
            })));
        }
        if (assetsData) setAssets(assetsData);
        if (personnelData) setPersonnel(personnelData);

        setIsLoading(false);
    }

    const handleAssignmentChange = (resourceId: string, assignedId: string) => {
        setAllocations(prev =>
            prev.map(a => a.resourceId === resourceId ? { ...a, assignedId } : a)
        );
    };

    const handleSchedule = async () => {
        if (!startTime || !endTime) {
            alert("Please select a start and end time.");
            return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            alert("End time must be after start time.");
            return;
        }

        // Validate all resources are assigned
        const unassigned = allocations.find(a => !a.assignedId);
        if (unassigned) {
            if (!window.confirm("Some resources are not assigned to a specific asset or person. Do you wish to continue scheduling anyway?")) {
                return;
            }
        }

        setIsSaving(true);
        try {
            // 1. Insert Job Schedule
            const { error: scheduleError } = await createClient()
                .from("job_schedules")
                .insert({
                    job_id: jobId,
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                });

            if (scheduleError) throw scheduleError;

            // 2. Insert Allocations
            const validAllocations = allocations.filter(a => a.assignedId);
            if (validAllocations.length > 0) {
                const allocationInserts = validAllocations.map(a => {
                    const res = resources.find(r => r.id === a.resourceId);
                    return {
                        job_id: jobId,
                        start_time: start.toISOString(),
                        end_time: end.toISOString(),
                        asset_id: res?.resource_type === 'Asset' ? a.assignedId : null,
                        personnel_id: res?.resource_type === 'Personnel' ? a.assignedId : null,
                    };
                });

                const { error: allocError } = await createClient()
                    .from("allocations")
                    .insert(allocationInserts);

                if (allocError) throw allocError;
            }

            // 3. Update Job Status
            const { error: jobError } = await createClient()
                .from("jobs")
                .update({ status_id: "Job Scheduled" })
                .eq("id", jobId);

            if (jobError) throw jobError;

            onScheduled();
        } catch (error: any) {
            console.error(error);
            alert("Failed to schedule job: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-gray-900 border-b pb-4 flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                        Schedule Job
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading job requirements...</div>
                ) : (
                    <div className="space-y-6 mt-2">
                        {/* Job Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-1">{job?.customers?.name || 'Customer'}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{job?.task_description || job?.job_brief}</p>
                            {job?.location && (
                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                    <span className="font-semibold mr-1">Location:</span> {job.location}
                                </p>
                            )}
                        </div>

                        {/* Timing */}
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">Schedule Window</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full text-sm border rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full text-sm border rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignments */}
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">Resource Allocation</h4>

                            {resources.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No resources requested in the quote.</p>
                            ) : (
                                <div className="space-y-3">
                                    {resources.map((res: any) => {
                                        const isAsset = res.resource_type === "Asset";
                                        const currentVal = allocations.find(a => a.resourceId === res.id)?.assignedId || "";

                                        return (
                                            <div key={res.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                                <div className="flex items-center mb-2 sm:mb-0">
                                                    {isAsset ? <Truck className="h-4 w-4 text-blue-500 mr-2" /> : <User className="h-4 w-4 text-orange-500 mr-2" />}
                                                    <div>
                                                        <span className="font-semibold text-sm block">
                                                            {isAsset ? res.asset_name : res.qualification_name || res.personnel_name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                            Required Qty: {res.qty}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="sm:w-1/2">
                                                    <select
                                                        value={currentVal}
                                                        onChange={(e) => handleAssignmentChange(res.id, e.target.value)}
                                                        className={`w-full text-sm border p-2 rounded ${currentVal ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}
                                                    >
                                                        <option value="">{isAsset ? "Select specific asset..." : "Select specific personnel..."}</option>
                                                        {isAsset ? (
                                                            assets.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                                                            ))
                                                        ) : (
                                                            personnel.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSchedule}
                        disabled={isSaving || isLoading}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        {isSaving ? "Scheduling..." : <><CheckCircle className="mr-2 h-4 w-4" /> Confirm Schedule</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
