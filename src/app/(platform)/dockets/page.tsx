"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import moment from "moment";

interface Docket {
    id: string;
    job_id: string;
    date: string;
    machine_hours: number;
    operator_hours: number;
    is_locked: boolean;
    jobs: {
        customer_id: string;
        customers: { name: string };
    };
}

export default function DocketsPage() {
    const [dockets, setDockets] = useState<Docket[]>([]);
    const [pendingJobs, setPendingJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'all' | 'today' | 'active' | 'completed'>('today');

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setDockets([]);
            setPendingJobs([]);

            // 1. Fetch Dockets (if applicable)
            if (['all', 'today', 'completed'].includes(viewMode)) {
                let query = createClient()
                    .from("site_dockets")
                    .select("*, jobs(customer_id, customers(name))")
                    .order("date", { ascending: false });

                if (viewMode === 'today') {
                    // Dockets created exactly today (local date string)
                    const todayDateString = moment().format('YYYY-MM-DD');
                    query = query.eq('date', todayDateString);
                }

                const { data: docketsData } = await query;
                if (docketsData) setDockets(docketsData as any);
            }

            // 2. Fetch Pending Jobs (if applicable)
            if (['all', 'today', 'active'].includes(viewMode)) {
                let pendingJobsData: any[] = [];

                if (viewMode === 'today') {
                    // We need jobs that have allocations or schedules today.
                    // For MVP simplicity, we'll fetch all active jobs and check if they have schedules today.
                    // In a production app, this would be a more complex join.
                    const todayStart = moment().startOf('day').toISOString();
                    const todayEnd = moment().endOf('day').toISOString();

                    const [{ data: allocData }, { data: schedData }] = await Promise.all([
                        createClient().from("allocations").select("job_id").gte("start_time", todayStart).lte("end_time", todayEnd),
                        createClient().from("job_schedules").select("job_id").gte("start_time", todayStart).lte("end_time", todayEnd)
                    ]);

                    const activeJobIds = new Set<string>();
                    allocData?.forEach(a => activeJobIds.add(a.job_id));
                    schedData?.forEach(s => activeJobIds.add(s.job_id));

                    if (activeJobIds.size > 0) {
                        const { data: jobsData } = await createClient()
                            .from("jobs")
                            .select("*, customers(name)")
                            .in("id", Array.from(activeJobIds))
                            .in("status_id", ["Job Scheduled", "Allocated", "Site Docket"])
                            .order("created_at", { ascending: false });

                        pendingJobsData = jobsData || [];
                    }
                } else {
                    // All or Active: Just fetch all pending jobs
                    const { data: jobsData } = await createClient()
                        .from("jobs")
                        .select("*, customers(name)")
                        .in("status_id", ["Job Scheduled", "Allocated", "Site Docket"])
                        .order("created_at", { ascending: false });

                    pendingJobsData = jobsData || [];
                }

                setPendingJobs(pendingJobsData);
            }

            setIsLoading(false);
        }

        fetchData();
    }, [viewMode]);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Dockets</h1>
                    <p className="mt-2 text-gray-600">
                        Manage active job dockets and review completed history.
                    </p>
                </div>

                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setViewMode('today')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setViewMode('completed')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Pending Jobs Section */}
                {['all', 'today', 'active'].includes(viewMode) && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {viewMode === 'today' ? "Active Jobs (Today)" : "Active Jobs (Requires Docket)"}
                        </h2>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>Created</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Job Brief</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-4">Loading...</TableCell></TableRow>
                                    ) : pendingJobs.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No active jobs found for this filter.</TableCell></TableRow>
                                    ) : (
                                        pendingJobs.map((job) => (
                                            <TableRow key={job.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{job.customers?.name || "Unknown"}</TableCell>
                                                <TableCell className="max-w-xs"><div className="truncate">{job.job_brief}</div></TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                        {job.status_id}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link
                                                        href={`/docket?jobId=${job.id}`}
                                                        target="_blank"
                                                        className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none bg-blue-600 text-white shadow-sm hover:bg-blue-700 h-7 px-3"
                                                    >
                                                        Open Docket
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Completed Dockets Section */}
                {['all', 'today', 'completed'].includes(viewMode) && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Completed Dockets</h2>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Machine Hrs</TableHead>
                                        <TableHead className="text-right">Op Hrs</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                Loading dockets...
                                            </TableCell>
                                        </TableRow>
                                    ) : dockets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No completed dockets found for this filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dockets.map((docket) => (
                                            <TableRow key={docket.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell>{new Date(docket.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{docket.jobs?.customers?.name || "Unknown"}</TableCell>
                                                <TableCell className="text-right">{docket.machine_hours}</TableCell>
                                                <TableCell className="text-right">{docket.operator_hours}</TableCell>
                                                <TableCell>
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                        docket.is_locked
                                                            ? "bg-green-50 text-green-700 ring-green-600/20"
                                                            : "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                                                    )}>
                                                        {docket.is_locked ? "Locked" : "Open"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/docket?jobId=${docket.job_id}`} target="_blank" className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none bg-gray-100 text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-200 h-7 px-3">
                                                        View Docket
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
