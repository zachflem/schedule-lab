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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Phone, MapPin, Calendar, Clock, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { GrowingForm } from "@/components/jobs/GrowingForm";

interface Enquiry {
    id: string;
    customer_name: string;
    contact_email: string;
    contact_phone: string;
    job_details: string;
    location: string;
    preferred_date: string;
    status: string;
    dispatcher_notes?: string;
    is_trashed: boolean;
    created_at: string;
    anticipated_hours: number | null;
    site_inspection_required: boolean;
    asset_type_id: string | null;
    asset_types?: { name: string };
    po_number: string | null;
}

export default function EnquiriesPage() {
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'active' | 'converted' | 'trash'>('active');

    // Clarification Workflow
    const [clarifyingEnquiry, setClarifyingEnquiry] = useState<Enquiry | null>(null);
    const [dispatcherNotes, setDispatcherNotes] = useState("");
    const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
    const [companyName, setCompanyName] = useState("ScheduleLab");

    // Conversion Workflow
    const [convertingEnquiry, setConvertingEnquiry] = useState<Enquiry | null>(null);
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("NEW");
    const [isConverting, setIsConverting] = useState(false);
    const [newlyConvertedJobId, setNewlyConvertedJobId] = useState<string | null>(null);

    useEffect(() => {
        fetchEnquiries();
    }, [viewMode]);

    useEffect(() => {
        fetchCustomers();
        fetchBranding();
    }, []);

    async function fetchBranding() {
        const { data } = await createClient().from("platform_settings").select("company_name").eq("id", "global").single();
        if (data?.company_name) setCompanyName(data.company_name);
    }

    async function fetchCustomers() {
        const { data } = await createClient().from("customers").select("id, name").order("name");
        if (data) setCustomers(data);
    }

    async function fetchEnquiries() {
        setIsLoading(true);

        let query = createClient()
            .from("enquiries")
            .select("*, asset_types(name)")
            .order("created_at", { ascending: false });

        if (viewMode === 'trash') {
            query = query.eq("is_trashed", true);
        } else if (viewMode === 'converted') {
            query = query.eq("is_trashed", false).eq("status", "Converted");
        } else {
            // active
            query = query.eq("is_trashed", false).neq("status", "Converted");
        }

        const { data, error } = await query;

        if (!error && data) {
            setEnquiries(data);
        }
        setIsLoading(false);
    }

    async function toggleTrashStatus(id: string, currentlyTrashed: boolean) {
        const { error } = await createClient()
            .from("enquiries")
            .update({ is_trashed: !currentlyTrashed })
            .eq("id", id);

        if (error) {
            alert("Failed to move enquiry: " + error.message);
        } else {
            fetchEnquiries();
        }
    }

    // (Removed basic updateStatus in favor of targeted workflows below)

    async function handleClarifySubmit() {
        if (!clarifyingEnquiry || !dispatcherNotes.trim()) return;
        setIsSubmittingClarification(true);

        try {
            // Trigger Email
            const res = await fetch("/api/enquiry/clarify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: clarifyingEnquiry.contact_email,
                    customerName: clarifyingEnquiry.customer_name,
                    notes: dispatcherNotes,
                    companyName,
                }),
            });

            if (!res.ok) throw new Error("Failed to trigger email from API");

            // Update local DB Status
            await createClient()
                .from("enquiries")
                .update({
                    status: "Clarification Requested",
                    dispatcher_notes: dispatcherNotes
                })
                .eq("id", clarifyingEnquiry.id);

            setClarifyingEnquiry(null);
            setDispatcherNotes("");
            fetchEnquiries();
        } catch (error) {
            console.error(error);
            alert("Error sending clarification requirement. Check server logs if email failed.");
        } finally {
            setIsSubmittingClarification(false);
        }
    }

    async function handleConvertSubmit() {
        if (!convertingEnquiry) return;
        setIsConverting(true);

        try {
            let finalCustomerId = selectedCustomerId;

            // 1. Create new customer if requested
            if (selectedCustomerId === "NEW") {
                const { data: newCustomer, error: custError } = await createClient()
                    .from("customers")
                    .insert({
                        name: convertingEnquiry.customer_name,
                        email: convertingEnquiry.contact_email,
                        phone: convertingEnquiry.contact_phone,
                    })
                    .select()
                    .single();

                if (custError) throw custError;
                finalCustomerId = newCustomer.id;
            }

            // 2. Create Job in 'Enquiry' pipeline stage
            const compiledBrief = `
Original Enquiry:
${convertingEnquiry.job_details}

---
Anticipated Hours: ${convertingEnquiry.anticipated_hours || "Not specified"}
Site Inspection Required: ${convertingEnquiry.site_inspection_required ? "YES" : "NO"}
Asset Preference: ${convertingEnquiry.asset_types?.name || "None specified"}
            `.trim();

            const { data: newJob, error: jobError } = await createClient()
                .from("jobs")
                .insert({
                    customer_id: finalCustomerId,
                    status_id: "Enquiry",
                    job_brief: compiledBrief,
                    location: convertingEnquiry.location || null,
                    po_number: convertingEnquiry.po_number || null,
                })
                .select()
                .single();
            if (jobError) throw jobError;

            // 3. Mark the Enquiry Record as Converted
            await createClient()
                .from("enquiries")
                .update({ status: "Converted" })
                .eq("id", convertingEnquiry.id);

            setConvertingEnquiry(null);
            fetchEnquiries();
            fetchCustomers(); // Update customer list incase we just created one

            // Open the Growing Form instantly with the new job ID
            if (newJob?.id) {
                setNewlyConvertedJobId(newJob.id);
            } else {
                alert("Enquiry successfully pushed to the Jobs pipeline!");
            }

        } catch (error: any) {
            console.error(error);
            alert("Error converting to job: " + error.message);
        } finally {
            setIsConverting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Incoming Enquiries</h1>
                    <p className="text-sm text-gray-500">Manage public job requests from the enquiry form.</p>
                </div>

                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setViewMode('converted')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'converted' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Converted
                    </button>
                    <button
                        onClick={() => setViewMode('trash')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'trash' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trash
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-[200px]">Customer</TableHead>
                            <TableHead>Job Details</TableHead>
                            <TableHead>Requested Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">Loading enquiries...</TableCell>
                            </TableRow>
                        ) : enquiries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">No enquiries found.</TableCell>
                            </TableRow>
                        ) : (
                            enquiries.map((enquiry) => (
                                <TableRow key={enquiry.id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="align-top">
                                        <div className="font-bold text-gray-900">{enquiry.customer_name}</div>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <Mail className="h-3 w-3 mr-1" /> {enquiry.contact_email}
                                        </div>
                                        {enquiry.contact_phone && (
                                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                                <Phone className="h-3 w-3 mr-1" /> {enquiry.contact_phone}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2 hover:line-clamp-none cursor-default mb-2">
                                            {enquiry.job_details}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {enquiry.asset_types?.name && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    {enquiry.asset_types.name}
                                                </span>
                                            )}
                                            {enquiry.anticipated_hours && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    {enquiry.anticipated_hours} hrs
                                                </span>
                                            )}
                                            {enquiry.site_inspection_required && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    Site Inspection Req.
                                                </span>
                                            )}
                                            {enquiry.po_number && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                                    PO: {enquiry.po_number}
                                                </span>
                                            )}
                                        </div>

                                        {enquiry.location && (
                                            <div className="flex items-center text-xs text-gray-500 mt-2">
                                                <MapPin className="h-3 w-3 mr-1" /> {enquiry.location}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        {enquiry.preferred_date ? (
                                            <div className="flex items-center text-sm text-gray-900">
                                                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                                {format(new Date(enquiry.preferred_date), "dd MMM yyyy")}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic text-sm">Not specified</span>
                                        )}
                                        <div className="flex items-center text-[10px] text-gray-400 mt-1">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Received {format(new Date(enquiry.created_at), "dd/MM/yy HH:mm")}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${enquiry.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                            enquiry.status === 'Reviewed' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                            {enquiry.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right align-top">
                                        <div className="space-y-2 flex flex-col items-end">
                                            {enquiry.status === "Converted" ? (
                                                <span className="text-xs text-gray-400 italic mb-1 block">Converted</span>
                                            ) : (
                                                <>
                                                    {viewMode === 'active' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setClarifyingEnquiry(enquiry);
                                                                    setDispatcherNotes(enquiry.dispatcher_notes || "");
                                                                }}
                                                                className="w-32 text-xs px-2 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded hover:bg-yellow-100 transition-colors shadow-sm font-medium"
                                                            >
                                                                Clarify
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConvertingEnquiry(enquiry);
                                                                    setSelectedCustomerId("NEW");
                                                                }}
                                                                className="w-32 text-xs px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm font-medium"
                                                            >
                                                                Convert to Job
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            {viewMode !== 'converted' && (
                                                <button
                                                    onClick={() => toggleTrashStatus(enquiry.id, enquiry.is_trashed)}
                                                    className={`w-32 text-xs px-2 py-1.5 border rounded transition-colors shadow-sm font-medium ${viewMode === 'trash'
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                        }`}
                                                >
                                                    {viewMode === 'trash' ? 'Restore Enquiry' : 'Move to Trash'}
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* CLARIFICATION DIALOG */}
            <Dialog open={!!clarifyingEnquiry} onOpenChange={(open: boolean) => !open && setClarifyingEnquiry(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Refer for Clarification</DialogTitle>
                        <DialogDescription>
                            Ask the customer for more details about their enquiry. This will trigger an email notification to them.
                        </DialogDescription>
                    </DialogHeader>

                    {clarifyingEnquiry && (
                        <div className="space-y-4 pt-2">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                <span className="font-bold text-gray-700 block mb-1">Customer Details:</span>
                                {clarifyingEnquiry.customer_name} ({clarifyingEnquiry.contact_email})
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900 block">Dispatcher Notes (Included in email)</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-gray-400"
                                    placeholder="e.g., Hi, can you specify what size crane you think you'll need? Are there any powerlines near the access gate?"
                                    value={dispatcherNotes}
                                    onChange={(e) => setDispatcherNotes(e.target.value)}
                                    disabled={isSubmittingClarification}
                                />
                            </div>

                            <div className="flex justify-end pt-4 space-x-2">
                                <button
                                    onClick={() => setClarifyingEnquiry(null)}
                                    disabled={isSubmittingClarification}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClarifySubmit}
                                    disabled={isSubmittingClarification || !dispatcherNotes.trim()}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                >
                                    {isSubmittingClarification && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                    {isSubmittingClarification ? "Sending Email..." : "Send Clarification Request"}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* CONVERSION DIALOG */}
            <Dialog open={!!convertingEnquiry} onOpenChange={(open: boolean) => !open && setConvertingEnquiry(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert Enquiry to Job</DialogTitle>
                        <DialogDescription>
                            Process this enquiry into the operational pipeline.
                        </DialogDescription>
                    </DialogHeader>

                    {convertingEnquiry && (
                        <div className="space-y-6 pt-2">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-900 block">Assign to Customer Account</label>
                                <p className="text-xs text-gray-500 -mt-2 mb-3">
                                    Does this enquiry belong to an existing ScheduleLab customer, or should we create a new profile?
                                </p>

                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    disabled={isConverting}
                                >
                                    <option value="NEW">✨ Create New Customer: {convertingEnquiry.customer_name}</option>
                                    <optgroup label="Existing Customers">
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="bg-blue-50 p-4 flex items-start rounded-lg border border-blue-100">
                                <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-700">
                                    <p className="font-bold mb-1">Conversion Action</p>
                                    <p>Clicking convert will generate a new Job linked to the selected Customer profile.</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 space-x-2">
                                <button
                                    onClick={() => setConvertingEnquiry(null)}
                                    disabled={isConverting}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConvertSubmit}
                                    disabled={isConverting}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                                >
                                    {isConverting && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                    {isConverting ? "Converting..." : "Accept & Convert to Job"}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <GrowingForm
                open={!!newlyConvertedJobId}
                onClose={() => setNewlyConvertedJobId(null)}
                onCloseWithSuccess={() => {
                    setNewlyConvertedJobId(null);
                    fetchEnquiries();
                }}
                jobId={newlyConvertedJobId}
            />
        </div>
    );
}
