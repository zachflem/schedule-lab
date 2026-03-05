"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog/index";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2, AlertTriangle, CheckCircle, Clock, ShieldCheck, Upload, FileText, X, Save, Edit2 } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

interface PersonnelQualification {
    qualification_id: string;
    personnel_id: string;
    expiry_date: string;
    document_url?: string | null;
    qualifications: {
        name: string;
    };
}

interface LicenseManagerProps {
    isOpen: boolean;
    onClose: () => void;
    person: { id: string; name: string } | null;
}

export function LicenseManager({ isOpen, onClose, person }: LicenseManagerProps) {
    const [records, setRecords] = useState<PersonnelQualification[]>([]);
    const [availableQuals, setAvailableQuals] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // New Record Form
    const [selectedQualId, setSelectedQualId] = useState("");
    const [newExpiry, setNewExpiry] = useState("");

    // Inline Edit & Upload State
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editExpiry, setEditExpiry] = useState("");
    const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);

    // Deletion State
    const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && person) {
            setSelectedQualId("");
            setNewExpiry("");
            setEditingRecordId(null);
            setUploadingRecordId(null);
            fetchAvailableQuals();
            fetchRecords(person.id);
        }
    }, [isOpen, person]);

    async function fetchAvailableQuals() {
        const { data } = await createClient().from("qualifications").select("id, name").order("name");
        if (data) setAvailableQuals(data);
    }

    async function fetchRecords(personId: string) {
        setIsLoading(true);
        // Supabase allows joining the referenced table to get the name
        const { data, error } = await createClient()
            .from("personnel_qualifications")
            .select("personnel_id, qualification_id, expiry_date, document_url, qualifications(name)")
            .eq("personnel_id", personId)
            .order("expiry_date", { ascending: true });

        if (error) {
            console.error("Error fetching compliance records:", error);
        } else if (data) {
            setRecords(data as any[]);
        }
        setIsLoading(false);
    }

    async function handleAddRecord() {
        if (!person || !selectedQualId) return; // Expiry can be optional for some quals

        const { error } = await createClient()
            .from("personnel_qualifications")
            .upsert([{ // Upsert in case it already exists to just update expiry
                personnel_id: person.id,
                qualification_id: selectedQualId,
                expiry_date: newExpiry || null
            }]);

        if (error) {
            alert("Error adding compliance record: " + error.message);
        } else {
            setSelectedQualId("");
            setNewExpiry("");
            fetchRecords(person.id);
        }
    }

    async function handleConfirmDeleteRecord() {
        if (!person || !deletingRecordId) return;
        setIsDeleting(true);

        const { error } = await createClient()
            .from("personnel_qualifications")
            .delete()
            .match({ personnel_id: person.id, qualification_id: deletingRecordId });

        setIsDeleting(false);
        if (error) {
            alert("Error removing record: " + error.message);
        } else {
            setDeletingRecordId(null);
            fetchRecords(person.id);
        }
    }

    async function handleUpdateExpiry(qualId: string) {
        if (!person) return;
        const { error } = await createClient()
            .from("personnel_qualifications")
            .update({ expiry_date: editExpiry || null })
            .match({ personnel_id: person.id, qualification_id: qualId });

        if (error) {
            alert("Error updating expiry: " + error.message);
        } else {
            setEditingRecordId(null);
            fetchRecords(person.id);
        }
    }

    async function handleFileUpload(qualId: string, file: File) {
        if (!person) return;
        setUploadingRecordId(qualId);

        const fileExt = file.name.split('.').pop();
        const fileName = `${person.id}-${qualId}-${Date.now()}.${fileExt}`;
        const filePath = `compliance/${fileName}`;

        // 1. Upload to storage bucket
        const { error: uploadError } = await createClient().storage
            .from('compliance_docs')
            .upload(filePath, file);

        if (uploadError) {
            alert("Error uploading file: " + uploadError.message);
            setUploadingRecordId(null);
            return;
        }

        // 2. Get public URL
        const { data: publicUrlData } = createClient().storage
            .from('compliance_docs')
            .getPublicUrl(filePath);

        // 3. Update DB record
        const { error: dbError } = await createClient()
            .from("personnel_qualifications")
            .update({ document_url: publicUrlData.publicUrl })
            .match({ personnel_id: person.id, qualification_id: qualId });

        if (dbError) {
            alert("Error saving document URL to database: " + dbError.message);
        } else {
            fetchRecords(person.id);
        }
        setUploadingRecordId(null);
    }

    const getExpiryStatus = (dateStr: string | null) => {
        if (!dateStr) return { status: 'valid', label: 'No Expiry', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle };

        const expiry = moment(dateStr);
        const now = moment();
        const daysUntil = expiry.diff(now, 'days');

        if (daysUntil < 0) return { status: 'expired', label: 'Expired', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle };
        if (daysUntil <= 30) return { status: 'warning', label: `Expires in ${daysUntil} days`, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: Clock };
        return { status: 'valid', label: 'Valid', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle };
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b bg-gray-50 flex-none">
                        <DialogTitle className="text-xl">Compliance & Qualifications</DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Managing compliance for <span className="font-bold text-gray-900">{person?.name}</span>
                        </p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
                        {/* Add New License Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <h4 className="text-sm font-bold text-gray-900">Assign Qualification</h4>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Qualification Type</label>
                                    <select
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={selectedQualId}
                                        onChange={(e) => setSelectedQualId(e.target.value)}
                                    >
                                        <option value="" disabled>Select a qualification...</option>
                                        {availableQuals.map(q => (
                                            <option key={q.id} value={q.id}>{q.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newExpiry}
                                        onChange={(e) => setNewExpiry(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddRecord}
                                disabled={!selectedQualId}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                Save Compliance Record
                            </button>
                        </div>

                        {/* Active Licenses List */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-tight">Active Records</h4>

                            {isLoading ? (
                                <p className="text-sm text-gray-500 text-center py-4">Loading records...</p>
                            ) : records.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <ShieldCheck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500">No compliance records found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {records.map((record) => {
                                        const { label, color, bg, icon: StatusIcon } = getExpiryStatus(record.expiry_date);
                                        const isEditing = editingRecordId === record.qualification_id;
                                        const isUploading = uploadingRecordId === record.qualification_id;

                                        return (
                                            <div key={record.qualification_id} className={cn("p-4 rounded-lg border flex items-center justify-between", bg)}>
                                                <div className="flex items-start flex-1 min-w-0">
                                                    <StatusIcon className={cn("h-5 w-5 mr-3 mt-0.5 flex-shrink-0", color)} />
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">
                                                                {record.qualifications?.name || "Unknown Qualification"}
                                                            </p>
                                                            {record.document_url && (
                                                                <a href={record.document_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="View Document">
                                                                    <FileText className="h-4 w-4" />
                                                                </a>
                                                            )}
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <input
                                                                    type="date"
                                                                    className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs px-2 py-1 border text-gray-900"
                                                                    value={editExpiry}
                                                                    onChange={(e) => setEditExpiry(e.target.value)}
                                                                />
                                                                <button onClick={() => handleUpdateExpiry(record.qualification_id)} className="text-green-600 hover:text-green-800 p-1 bg-white rounded shadow-sm border"><Save className="h-3 w-3" /></button>
                                                                <button onClick={() => setEditingRecordId(null)} className="text-gray-500 hover:text-gray-700 p-1 bg-white rounded shadow-sm border"><X className="h-3 w-3" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className={cn("text-xs font-semibold", color)}>
                                                                    {label} {record.expiry_date && `(${moment(record.expiry_date).format('DD MMM YYYY')})`}
                                                                </p>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingRecordId(record.qualification_id);
                                                                        setEditExpiry(record.expiry_date || "");
                                                                    }}
                                                                    className="text-gray-400 hover:text-blue-600 focus:outline-none"
                                                                    title="Edit Expiry"
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <label className={cn("cursor-pointer p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-white bg-white/50 border shadow-sm", isUploading && "opacity-50 cursor-not-allowed animate-pulse")} title="Upload Document">
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            disabled={isUploading}
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    handleFileUpload(record.qualification_id, e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        <Upload className="h-4 w-4" />
                                                    </label>
                                                    <button
                                                        onClick={() => setDeletingRecordId(record.qualification_id)}
                                                        className="text-gray-400 hover:text-red-600 p-2 transition-colors rounded-full hover:bg-white bg-white/50 border shadow-sm"
                                                        title="Remove Record"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex-none">
                        <button
                            onClick={onClose}
                            className="bg-white border text-gray-700 px-4 py-2 rounded-md font-semibold text-sm hover:bg-gray-50 transition-colors w-full"
                        >
                            Close Manager
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                isOpen={!!deletingRecordId}
                onClose={() => setDeletingRecordId(null)}
                onConfirm={handleConfirmDeleteRecord}
                title="Remove Compliance Record"
                entityName="this compliance record"
                isDeleting={isDeleting}
            />
        </>
    );
}
