"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GrowingForm } from "@/components/jobs/GrowingForm";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    billing_address: string;
}

interface Job {
    id: string;
    status_id: string;
    job_type: string;
    location: string;
    crane_size: string;
    customers: {
        name: string;
    };
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'completed' | 'all'>('active');

    // Job Deletion Logic for Jobs Page Table
    const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const openForm = (jobId: string | null = null) => {
        setSelectedJobId(jobId);
        setIsFormOpen(true);
    };

    const fetchJobs = async () => {
        setIsLoading(true);
        // Fetch Jobs with joined Customer name
        let query = createClient()
            .from("jobs")
            .select(`
        id, status_id, job_type, location, crane_size,
        customers ( name )
      `)
            .order("created_at", { ascending: false });

        if (viewMode === 'active') {
            query = query.neq("status_id", "Completed").neq("status_id", "Invoiced").neq("status_id", "Cancelled");
        } else if (viewMode === 'completed') {
            query = query.in("status_id", ["Completed", "Invoiced"]);
        }

        const { data: jobsData } = await query;
        if (jobsData) setJobs(jobsData as unknown as Job[]);
        setIsLoading(false);
    };

    const handleDeleteJob = async () => {
        if (!deletingJobId) return;
        setIsDeleting(true);

        try {
            await createClient().from("dockets").delete().eq("job_id", deletingJobId);
            await createClient().from("allocations").delete().eq("job_id", deletingJobId);
            await createClient().from("job_schedules").delete().eq("job_id", deletingJobId);
            await createClient().from("job_resources").delete().eq("job_id", deletingJobId);
            const { error } = await createClient().from("jobs").delete().eq("id", deletingJobId);

            if (error) throw error;
            fetchJobs();
        } catch (error: any) {
            alert("Error deleting job: " + error.message);
        } finally {
            setIsDeleting(false);
            setDeletingJobId(null);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [viewMode]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Operations Hub</h1>
                    <p className="mt-2 text-gray-600">
                        Manage enquiries, quotes, bookings, and customer profiles.
                    </p>
                </div>

                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
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

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsCustomerFormOpen(true)}
                        className="bg-white border text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                    >
                        + New Customer
                    </button>
                    <button
                        onClick={() => openForm()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                    >
                        + Create Job (Growing Form)
                    </button>
                </div>
            </div>

            {/* Growing Form Modal */}
            <GrowingForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onCloseWithSuccess={() => {
                    setIsFormOpen(false);
                    fetchJobs();
                }}
                jobId={selectedJobId}
            />

            {/* Customer Form Modal */}
            <CustomerForm
                isOpen={isCustomerFormOpen}
                onClose={() => setIsCustomerFormOpen(false)}
                onSuccess={() => {
                    setIsCustomerFormOpen(false);
                    fetchJobs(); // Refresh might be needed if user returns to GrowingForm
                }}
            />

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Asset Specification</TableHead>
                            <TableHead>Job Type</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    Loading jobs...
                                </TableCell>
                            </TableRow>
                        ) : jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No active jobs. Click "Create Job" to start an Enquiry.
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job) => (
                                <TableRow
                                    key={job.id}
                                    onClick={() => openForm(job.id)}
                                    className="cursor-pointer hover:bg-blue-50"
                                >
                                    <TableCell className="font-medium text-gray-900">
                                        {job.customers?.name || "Unknown"}
                                    </TableCell>
                                    <TableCell>{job.location}</TableCell>
                                    <TableCell>{job.crane_size}</TableCell>
                                    <TableCell className="text-gray-500">{job.job_type}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${['Completed', 'Invoiced'].includes(job.status_id)
                                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                            }`}>
                                            {job.status_id}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingJobId(job.id);
                                            }}
                                            className="text-gray-400 hover:text-red-600 p-2 rounded transition-colors"
                                            title="Delete Job"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <DeleteConfirmationDialog
                isOpen={!!deletingJobId}
                onClose={() => setDeletingJobId(null)}
                onConfirm={handleDeleteJob}
                title="Delete Job"
                entityName="this job and all associated records"
                isDeleting={isDeleting}
            />
        </div>
    );
}
