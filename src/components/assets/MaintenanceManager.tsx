"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog/index";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2, Wrench, Upload, FileText, CheckCircle, Save, Edit2, X } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

interface MaintenanceLog {
    id: string;
    asset_id: string;
    log_type: string;
    service_date: string;
    description: string;
    hours_at_service: number | null;
    cost: number | null;
    performed_by: string | null;
    document_url?: string | null;
}

interface MaintenanceManagerProps {
    isOpen: boolean;
    onClose: () => void;
    asset: { id: string; name: string } | null;
}

export function MaintenanceManager({ isOpen, onClose, asset }: MaintenanceManagerProps) {
    const [records, setRecords] = useState<MaintenanceLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New Record Form
    const [newLogType, setNewLogType] = useState("Maintenance");
    const [newServiceDate, setNewServiceDate] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newHours, setNewHours] = useState("");
    const [newCost, setNewCost] = useState("");
    const [newPerformedBy, setNewPerformedBy] = useState("");
    const [newFile, setNewFile] = useState<File | null>(null);

    // Inline Data State
    const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);

    // Deletion State
    const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && asset) {
            resetForm();
            fetchRecords(asset.id);
        }
    }, [isOpen, asset]);

    function resetForm() {
        setNewLogType("Maintenance");
        setNewServiceDate("");
        setNewDescription("");
        setNewHours("");
        setNewCost("");
        setNewPerformedBy("");
        setNewFile(null);
        setUploadingRecordId(null);
        setDeletingRecordId(null);
    }

    async function fetchRecords(assetId: string) {
        setIsLoading(true);
        const { data, error } = await createClient()
            .from("asset_maintenance_logs")
            .select("*")
            .eq("asset_id", assetId)
            .order("service_date", { ascending: false });

        if (error) {
            console.error("Error fetching maintenance logs:", error);
        } else if (data) {
            setRecords(data);
        }
        setIsLoading(false);
    }

    async function handleAddRecord() {
        if (!asset || !newServiceDate || !newDescription) return;
        setIsSaving(true);

        const { data: insertedRecord, error } = await createClient()
            .from("asset_maintenance_logs")
            .insert([{
                asset_id: asset.id,
                log_type: newLogType,
                service_date: newServiceDate,
                description: newDescription,
                hours_at_service: newHours ? parseFloat(newHours) : null,
                cost: newCost ? parseFloat(newCost) : null,
                performed_by: newPerformedBy || null
            }])
            .select()
            .single();

        if (error) {
            alert("Error adding maintenance log: " + error.message);
            setIsSaving(false);
            return;
        }

        if (newFile && insertedRecord) {
            const fileExt = newFile.name.split('.').pop();
            const fileName = `${asset.id}-${insertedRecord.id}-${Date.now()}.${fileExt}`;
            const filePath = `maintenance/${fileName}`;

            const { error: uploadError } = await createClient().storage.from('maintenance_docs').upload(filePath, newFile);
            if (!uploadError) {
                const { data: publicUrlData } = createClient().storage.from('maintenance_docs').getPublicUrl(filePath);
                await createClient().from("asset_maintenance_logs").update({ document_url: publicUrlData.publicUrl }).eq("id", insertedRecord.id);
            } else {
                alert("Error uploading file: " + uploadError.message);
            }
        }

        resetForm();
        fetchRecords(asset.id);
        setIsSaving(false);
    }

    async function handleConfirmDeleteRecord() {
        if (!asset || !deletingRecordId) return;
        setIsDeleting(true);

        const { error } = await createClient()
            .from("asset_maintenance_logs")
            .delete()
            .eq("id", deletingRecordId);

        setIsDeleting(false);
        if (error) {
            alert("Error removing log: " + error.message);
        } else {
            setDeletingRecordId(null);
            fetchRecords(asset.id);
        }
    }

    async function handleFileUpload(logId: string, file: File) {
        if (!asset) return;
        setUploadingRecordId(logId);

        const fileExt = file.name.split('.').pop();
        const fileName = `${asset.id}-${logId}-${Date.now()}.${fileExt}`;
        const filePath = `maintenance/${fileName}`;

        const { error: uploadError } = await createClient().storage
            .from('maintenance_docs')
            .upload(filePath, file);

        if (uploadError) {
            alert("Error uploading file: " + uploadError.message);
            setUploadingRecordId(null);
            return;
        }

        const { data: publicUrlData } = createClient().storage
            .from('maintenance_docs')
            .getPublicUrl(filePath);

        const { error: dbError } = await createClient()
            .from("asset_maintenance_logs")
            .update({ document_url: publicUrlData.publicUrl })
            .eq("id", logId);

        if (dbError) {
            alert("Error saving document URL to database: " + dbError.message);
        } else {
            fetchRecords(asset.id);
        }
        setUploadingRecordId(null);
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b bg-gray-50 flex-none">
                        <DialogTitle className="text-xl">Asset Maintenance Logs</DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Tracking service history for <span className="font-bold text-gray-900">{asset?.name}</span>
                        </p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
                        {/* Add New Log Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <h4 className="text-sm font-bold text-gray-900">Add Service Record</h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Log Type *</label>
                                    <select
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                                        value={newLogType}
                                        onChange={(e) => setNewLogType(e.target.value)}
                                        required
                                    >
                                        <option value="Inspection">Inspection</option>
                                        <option value="Servicing">Servicing</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Service Date *</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newServiceDate}
                                        onChange={(e) => setNewServiceDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description of Work *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newHours}
                                        onChange={(e) => setNewHours(e.target.value)}
                                        placeholder="e.g. 1500.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description of Work *</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="e.g. 250hr Scheduled Servicing..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours / Odometer at Service</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newHours}
                                        onChange={(e) => setNewHours(e.target.value)}
                                        placeholder="e.g. 1500.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cost / Invoice Total ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newCost}
                                        onChange={(e) => setNewCost(e.target.value)}
                                        placeholder="e.g. 500.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Performed By (Mechanic/Shop)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900"
                                        value={newPerformedBy}
                                        onChange={(e) => setNewPerformedBy(e.target.value)}
                                        placeholder="e.g. Bob's Garage"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Attach Document (Report/Invoice)</label>
                                    <input
                                        type="file"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 border text-gray-900 bg-white"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) setNewFile(e.target.files[0]);
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddRecord}
                                disabled={!newServiceDate || !newDescription || isSaving}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? "Saving Record..." : "Save Service Record"}
                            </button>
                        </div>

                        {/* Logs List */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-tight">Service History</h4>

                            {isLoading ? (
                                <p className="text-sm text-gray-500 text-center py-4">Loading records...</p>
                            ) : records.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <Wrench className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500">No maintenance records found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {records.map((record) => {
                                        const isUploading = uploadingRecordId === record.id;

                                        return (
                                            <div key={record.id} className="p-4 rounded-lg border flex items-start justify-between bg-white border-gray-200 hover:border-blue-200 transition-colors">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded border shrink-0",
                                                            record.log_type === 'Inspection' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                record.log_type === 'Servicing' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                    "bg-gray-50 text-gray-700 border-gray-200"
                                                        )}>
                                                            {record.log_type || "Maintenance"}
                                                        </span>
                                                        <h5 className="font-bold text-gray-900 truncate flex-1">
                                                            {record.description}
                                                        </h5>
                                                        {record.document_url && (
                                                            <a href={record.document_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1 rounded-md" title="View Invoice/Document">
                                                                <FileText className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                                                        <p><span className="font-semibold text-gray-700">Date:</span> {moment(record.service_date).format('DD MMM YYYY')}</p>
                                                        {record.hours_at_service !== null && (
                                                            <p><span className="font-semibold text-gray-700">Hours at Service:</span> {record.hours_at_service}</p>
                                                        )}
                                                        {record.cost !== null && (
                                                            <p><span className="font-semibold text-gray-700">Cost:</span> ${record.cost.toFixed(2)}</p>
                                                        )}
                                                        {record.performed_by && (
                                                            <p><span className="font-semibold text-gray-700">By:</span> {record.performed_by}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                                                    <label className={cn("cursor-pointer p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-50 border shadow-sm", isUploading && "opacity-50 cursor-not-allowed animate-pulse")} title="Upload Invoice/Report">
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            disabled={isUploading}
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    handleFileUpload(record.id, e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        <Upload className="h-4 w-4" />
                                                    </label>
                                                    <button
                                                        onClick={() => setDeletingRecordId(record.id)}
                                                        className="text-gray-400 hover:text-red-600 p-2 transition-colors rounded-full hover:bg-red-50 border shadow-sm"
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
                            Close Maintenance Logs
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                isOpen={!!deletingRecordId}
                onClose={() => setDeletingRecordId(null)}
                onConfirm={handleConfirmDeleteRecord}
                title="Remove Maintenance Record"
                entityName="this maintenance log"
                isDeleting={isDeleting}
            />
        </>
    );
}
