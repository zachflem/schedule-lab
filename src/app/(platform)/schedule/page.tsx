"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScheduleJobModal } from "@/components/schedule/ScheduleJobModal";
import { GrowingForm } from "@/components/jobs/GrowingForm";
import { CalendarRange } from "lucide-react";

// FullCalendar requires browser APIs, so we dynamically import it with SSR disabled
const GanttChart = dynamic(
    () => import("@/components/schedule/GanttChart").then((mod) => mod.GanttChart),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center bg-gray-50 border rounded-lg text-gray-500">Loading Gantt Engine...</div> }
);

export default function SchedulePage() {
    const [unscheduledJobs, setUnscheduledJobs] = useState<any[]>([]);
    const [schedulingJobId, setSchedulingJobId] = useState<string | null>(null);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchUnscheduled();
    }, [refreshTrigger]);

    async function fetchUnscheduled() {
        const { data } = await createClient()
            .from("jobs")
            .select("*, customers(name)")
            .eq("status_id", "Job Booked")
            .order("created_at", { ascending: true });

        if (data) setUnscheduledJobs(data);
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Schedule (Gantt)</h1>
                    <p className="mt-2 text-gray-600">Visual scheduling engine and allocation.</p>
                </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-[600px]">
                {/* Unscheduled Jobs Panel */}
                <div
                    className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col transition-colors border-2 relative"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50');
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
                    }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
                        try {
                            const dataStr = e.dataTransfer.getData('application/json');
                            if (!dataStr) return;
                            const data = JSON.parse(dataStr);
                            if (data.type === 'scheduled' && data.job_id) {
                                // Remove from schedule
                                await createClient().from("job_schedules").delete().eq("job_id", data.job_id);
                                await createClient().from("allocations").delete().eq("job_id", data.job_id);
                                await createClient().from("jobs").update({ status_id: 'Job Booked' }).eq("id", data.job_id);
                                setRefreshTrigger(prev => prev + 1);
                            }
                        } catch (err) {
                            console.error("Failed to unschedule job via drop", err);
                        }
                    }}
                >
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center pointer-events-none">
                        <CalendarRange className="mr-2 h-4 w-4 text-blue-600" />
                        Unscheduled Jobs ({unscheduledJobs.length})
                    </h2>

                    <div className="flex overflow-x-auto gap-4 custom-scrollbar pb-2">
                        {unscheduledJobs.length === 0 ? (
                            <p className="text-xs text-gray-500 italic text-center py-4 w-full">All booked jobs have been scheduled.</p>
                        ) : (
                            unscheduledJobs.map((job: any) => (
                                <div
                                    key={job.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData('application/json', JSON.stringify({
                                            type: 'unscheduled',
                                            id: job.id
                                        }));
                                    }}
                                    onClick={() => setSchedulingJobId(job.id)}
                                    className="p-3 w-64 flex-shrink-0 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing transition-all bg-gray-50 hover:bg-white group"
                                >
                                    <div className="font-bold text-gray-900 text-sm group-hover:text-blue-700 truncate">{job.customers?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-1">{job.task_description || job.job_brief}</div>
                                    {job.location && <div className="text-[10px] text-gray-400 mt-2 truncate">📍 {job.location}</div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Gantt Area */}
                <div className="flex-1 min-w-0">
                    <GanttChart
                        key={refreshTrigger}
                        onJobClick={(id) => setActiveJobId(id)}
                        onScheduleChange={(jobId) => {
                            if (jobId) {
                                setUnscheduledJobs(prev => prev.filter(j => j.id !== jobId));
                            }
                            setRefreshTrigger(prev => prev + 1);
                        }}
                    />
                </div>
            </div>

            {schedulingJobId && (
                <ScheduleJobModal
                    isOpen={!!schedulingJobId}
                    jobId={schedulingJobId}
                    onClose={() => setSchedulingJobId(null)}
                    onScheduled={() => {
                        setSchedulingJobId(null);
                        setRefreshTrigger(prev => prev + 1); // Refresh Gantt and list
                    }}
                />
            )}

            {activeJobId && (
                <GrowingForm
                    open={!!activeJobId}
                    jobId={activeJobId}
                    onClose={() => setActiveJobId(null)}
                    onCloseWithSuccess={() => {
                        setActiveJobId(null);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}
        </div>
    );
}
