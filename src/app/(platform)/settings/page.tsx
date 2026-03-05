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
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2, Plus, ListChecks, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AssetType {
    id: string;
    name: string;
    checklist_questions?: string[];
    created_at: string;
}

interface Qualification {
    id: string;
    name: string;
    rate_hourly: number | null;
    rate_after_hours: number | null;
    created_at: string;
}

export default function SettingsPage() {
    const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
    const [newAssetTypeName, setNewAssetTypeName] = useState("");

    // Asset Checklist State
    const [editingChecklistType, setEditingChecklistType] = useState<AssetType | null>(null);
    const [checklistDraft, setChecklistDraft] = useState<string[]>([]);
    const [newChecklistQuestion, setNewChecklistQuestion] = useState("");
    const [isExplainChecklistOpen, setIsExplainChecklistOpen] = useState(false);

    const [qualifications, setQualifications] = useState<Qualification[]>([]);
    const [newQualName, setNewQualName] = useState("");
    const [newQualHourly, setNewQualHourly] = useState("");
    const [newQualAH, setNewQualAH] = useState("");

    // Editing State
    const [editingQualId, setEditingQualId] = useState<string | null>(null);
    const [editQualName, setEditQualName] = useState("");
    const [editQualHourly, setEditQualHourly] = useState("");
    const [editQualAH, setEditQualAH] = useState("");

    const [isLoading, setIsLoading] = useState(true);

    // Deletion states
    const [deletingAssetTypeId, setDeletingAssetTypeId] = useState<string | null>(null);
    const [deletingQualId, setDeletingQualId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Platform Settings
    const [standardHireTerms, setStandardHireTerms] = useState("");
    const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState(30);

    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
        fetchData();
    }, []);

    async function fetchData() {
        setIsLoading(true);
        await Promise.all([
            fetchAssetTypes(),
            fetchQualifications(),
            fetchPlatformSettings()
        ]);
        setIsLoading(false);
    }

    async function fetchAssetTypes() {
        const { data, error } = await createClient()
            .from("asset_types")
            .select("*")
            .order("name");

        if (error) {
            console.error("Error fetching asset types:", error);
        } else if (data) {
            setAssetTypes(data);
        }
    }

    async function fetchQualifications() {
        const { data, error } = await createClient()
            .from("qualifications")
            .select("*")
            .order("name");

        if (error) {
            console.error("Error fetching qualifications:", error);
        } else if (data) {
            setQualifications(data);
        }
    }

    async function fetchPlatformSettings() {
        const { data, error } = await createClient()
            .from("platform_settings")
            .select("*")
            .eq("id", "global")
            .single();

        if (error) {
            console.error("Error fetching platform settings:", error);
        } else if (data) {
            setStandardHireTerms(data.standard_hire_terms || "");
            setDefaultPaymentTermsDays(data.default_payment_terms_days ?? 30);
        }
    }

    async function handleAddAssetType() {
        if (!newAssetTypeName.trim()) return;

        const { error } = await createClient()
            .from("asset_types")
            .insert([{ name: newAssetTypeName.trim() }]);

        if (!error) {
            setNewAssetTypeName("");
            fetchAssetTypes();
        } else {
            alert("Error adding asset type: " + error.message);
        }
    }

    const startEditingChecklist = (type: AssetType) => {
        setEditingChecklistType(type);
        setChecklistDraft(type.checklist_questions || []);
    };

    const addChecklistQuestion = () => {
        if (!newChecklistQuestion.trim()) return;
        setChecklistDraft([...checklistDraft, newChecklistQuestion.trim()]);
        setNewChecklistQuestion("");
    };

    const removeChecklistQuestion = (index: number) => {
        const updated = [...checklistDraft];
        updated.splice(index, 1);
        setChecklistDraft(updated);
    };

    const saveChecklist = async () => {
        if (!editingChecklistType) return;
        const { error } = await createClient()
            .from("asset_types")
            .update({ checklist_questions: checklistDraft })
            .eq("id", editingChecklistType.id);

        if (!error) {
            setEditingChecklistType(null);
            fetchAssetTypes();
        } else {
            alert("Error saving checklist: " + error.message);
        }
    }

    async function handleAddQualification() {
        if (!newQualName.trim()) return;

        const { error } = await createClient()
            .from("qualifications")
            .insert([{
                name: newQualName.trim(),
                rate_hourly: newQualHourly === "" ? null : parseFloat(newQualHourly),
                rate_after_hours: newQualAH === "" ? null : parseFloat(newQualAH)
            }]);

        if (!error) {
            setNewQualName("");
            setNewQualHourly("");
            setNewQualAH("");
            fetchQualifications();
        } else {
            alert("Error adding qualification: " + error.message);
        }
    }

    const startEditing = (qual: Qualification) => {
        setEditingQualId(qual.id);
        setEditQualName(qual.name);
        setEditQualHourly(qual.rate_hourly?.toString() || "");
        setEditQualAH(qual.rate_after_hours?.toString() || "");
    };

    const cancelEditing = () => {
        setEditingQualId(null);
    };

    async function handleUpdateQualification() {
        if (!editingQualId || !editQualName.trim()) return;

        const { error } = await createClient()
            .from("qualifications")
            .update({
                name: editQualName.trim(),
                rate_hourly: editQualHourly === "" ? null : parseFloat(editQualHourly),
                rate_after_hours: editQualAH === "" ? null : parseFloat(editQualAH)
            })
            .eq("id", editingQualId);

        if (!error) {
            setEditingQualId(null);
            fetchQualifications();
        } else {
            alert("Error updating qualification: " + error.message);
        }
    }

    async function handleConfirmDeleteAssetType() {
        if (!deletingAssetTypeId) return;
        setIsDeleting(true);

        const { error } = await createClient()
            .from("asset_types")
            .delete()
            .eq("id", deletingAssetTypeId);

        setIsDeleting(false);
        if (!error) {
            setDeletingAssetTypeId(null);
            fetchAssetTypes();
        } else {
            alert("Error deleting asset type: " + error.message);
        }
    }

    async function handleConfirmDeleteQualification() {
        if (!deletingQualId) return;
        setIsDeleting(true);

        const { error } = await createClient()
            .from("qualifications")
            .delete()
            .eq("id", deletingQualId);

        setIsDeleting(false);
        if (!error) {
            setDeletingQualId(null);
            fetchQualifications();
        } else {
            alert("Error deleting qualification: " + error.message);
        }
    }

    async function handleUpdatePlatformSettings() {
        const { error } = await createClient()
            .from("platform_settings")
            .upsert({
                id: "global",
                standard_hire_terms: standardHireTerms,
                default_payment_terms_days: defaultPaymentTermsDays
            }, { onConflict: 'id' });

        if (error) {
            alert("Error updating settings: " + error.message);
        } else {
            alert("Platform Settings updated automatically via form save button.");
        }
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500 font-mono text-sm">Loading Settings Workspace...</div>;
    return (
        <div className="space-y-12 pb-20">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Settings</h1>
                <p className="mt-1 text-gray-500">Manage global configurations, pricing models, and compliance roles.</p>
            </div>

            {/* SECTION: ASSETS */}
            <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Assets & Fleet</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Machine Types</h3>
                        <p className="text-sm text-gray-500">Define the categories of equipment in your fleet.</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="e.g. Excavator"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                value={newAssetTypeName}
                                onChange={(e) => setNewAssetTypeName(e.target.value)}
                            />
                            <button
                                onClick={handleAddAssetType}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsExplainChecklistOpen(true)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center"
                        >
                            <ListChecks className="h-4 w-4 mr-1" /> Explain Checklists
                        </button>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Type Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={2} className="text-center py-4">Loading...</TableCell></TableRow>
                                ) : assetTypes.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="text-center py-4 text-gray-500">No types defined.</TableCell></TableRow>
                                ) : (
                                    assetTypes.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-medium text-gray-700">{type.name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => startEditingChecklist(type)} className="text-blue-600 hover:text-blue-900 px-2 py-1 flex items-center text-xs font-semibold rounded bg-blue-50 border border-blue-100">
                                                        <ListChecks className="h-3 w-3 mr-1" /> Checklist ({type.checklist_questions?.length || 0})
                                                    </button>
                                                    <button onClick={() => setDeletingAssetTypeId(type.id)} className="text-red-600 hover:text-red-900 p-2">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </section>

            {/* SECTION: PERSONNEL */}
            <section className="space-y-6 pt-6">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                    <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Personnel & Rates</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Professional Roles</h3>
                        <p className="text-sm text-gray-500">Manage qualifications and their corresponding charge-out rates.</p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                            <input
                                type="text"
                                placeholder="Qualification Name"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                value={newQualName}
                                onChange={(e) => setNewQualName(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    placeholder="Hourly ($)"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                    value={newQualHourly}
                                    onChange={(e) => setNewQualHourly(e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="AH (+ $)"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                    value={newQualAH}
                                    onChange={(e) => setNewQualAH(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleAddQualification}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Qualification
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Qualification</TableHead>
                                    <TableHead className="text-right">Hourly</TableHead>
                                    <TableHead className="text-right">After Hours</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
                                ) : qualifications.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-500">No qualifications defined.</TableCell></TableRow>
                                ) : (
                                    qualifications.map((qual) => (
                                        <TableRow key={qual.id}>
                                            <TableCell className="font-medium text-gray-700">
                                                {editingQualId === qual.id ? (
                                                    <input
                                                        className="border rounded px-2 py-1 text-sm w-full"
                                                        value={editQualName}
                                                        onChange={(e) => setEditQualName(e.target.value)}
                                                    />
                                                ) : qual.name}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                {editingQualId === qual.id ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 text-sm w-20 text-right"
                                                        value={editQualHourly}
                                                        onChange={(e) => setEditQualHourly(e.target.value)}
                                                    />
                                                ) : `$${qual.rate_hourly || 0}`}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                {editingQualId === qual.id ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 text-sm w-20 text-right"
                                                        value={editQualAH}
                                                        onChange={(e) => setEditQualAH(e.target.value)}
                                                    />
                                                ) : `$${qual.rate_after_hours || 0}`}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editingQualId === qual.id ? (
                                                    <div className="flex justify-end space-x-2 text-xs">
                                                        <button onClick={handleUpdateQualification} className="text-green-600 font-bold hover:underline">Save</button>
                                                        <button onClick={cancelEditing} className="text-gray-400 hover:underline">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end space-x-3">
                                                        <button onClick={() => startEditing(qual)} className="text-blue-600 hover:text-blue-900 p-1">Edit</button>
                                                        <button onClick={() => setDeletingQualId(qual.id)} className="text-red-600 hover:text-red-900 p-1">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </section>



            {/* SECTION: TERMS & CONDITIONS */}
            <section className="space-y-6 pt-6 mb-12 border-t border-gray-100">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                    <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Terms & Conditions</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Payment Terms</h3>
                        <p className="text-sm text-gray-500">
                            Configure your default payment terms here. This value will be used as the default when creating new customers.
                        </p>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-900">Default Payment Terms (Days)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                    value={defaultPaymentTermsDays}
                                    onChange={(e) => setDefaultPaymentTermsDays(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleUpdatePlatformSettings}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Save Payment Terms
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Standard Hire Terms</h3>
                        <p className="text-sm text-gray-500">
                            Configure your default hire terms here. These terms will be included in your quotes and dockets (where applicable).
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Public Terms Link</h4>
                            <p className="text-[10px] text-blue-600 break-all">
                                {origin ? `${origin}/terms` : '/terms'}
                            </p>
                            <a
                                href="/terms"
                                target="_blank"
                                className="mt-2 inline-block text-[10px] font-bold text-blue-700 hover:underline"
                            >
                                View Live Page →
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Standard Hire Terms & Conditions</label>
                                <textarea
                                    className="w-full h-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900 font-mono"
                                    value={standardHireTerms}
                                    onChange={(e) => setStandardHireTerms(e.target.value)}
                                    placeholder="Enter your standard terms here..."
                                />
                            </div>
                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleUpdatePlatformSettings}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Save Terms & Conditions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <DeleteConfirmationDialog
                isOpen={!!deletingAssetTypeId}
                onClose={() => setDeletingAssetTypeId(null)}
                onConfirm={handleConfirmDeleteAssetType}
                title="Delete Asset Type"
                entityName="this asset type"
                isDeleting={isDeleting}
            />

            <DeleteConfirmationDialog
                isOpen={!!deletingQualId}
                onClose={() => setDeletingQualId(null)}
                onConfirm={handleConfirmDeleteQualification}
                title="Delete Professional Role / Qualification"
                entityName="this professional role"
                isDeleting={isDeleting}
            />

            {/* Checklist Editor Dialog */}
            <Dialog open={!!editingChecklistType} onOpenChange={(open: boolean) => !open && setEditingChecklistType(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingChecklistType?.name} Safety Checklist</DialogTitle>
                        <DialogDescription>
                            Configure the default safety questions operators must answer when this asset type is scheduled on a job.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                placeholder="Add a new question..."
                                value={newChecklistQuestion}
                                onChange={(e) => setNewChecklistQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklistQuestion()}
                            />
                            <button
                                onClick={addChecklistQuestion}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {checklistDraft.length === 0 ? (
                                <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">
                                    No questions configured. Operators will not see a checklist for this asset type.
                                </p>
                            ) : (
                                checklistDraft.map((q, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded border text-sm text-gray-800">
                                        <div className="font-bold text-gray-400 w-6 flex-shrink-0">{i + 1}.</div>
                                        <div className="flex-1">{q}</div>
                                        <button
                                            onClick={() => removeChecklistQuestion(i)}
                                            className="text-gray-400 hover:text-red-600 transition p-1"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <button onClick={() => setEditingChecklistType(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:underline">
                            Cancel
                        </button>
                        <button onClick={saveChecklist} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                            Save Checklist
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Explain Checklists Dialog */}
            <Dialog open={isExplainChecklistOpen} onOpenChange={setIsExplainChecklistOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>How Asset Checklists Work</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-gray-700 py-2">
                        <p>
                            <strong>Asset Checklists</strong> allow you to define specific safety questions that an operator must answer YES/NO/N/A to before beginning work with a specific type of machine.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>When you schedule a job and assign assets to it, the system looks at the <strong>Asset Type</strong> of each assigned machine.</li>
                            <li>If that Asset Type has safety questions configured here, those questions will automatically appear on the operator's Mobile Docket under the <strong>Safety Checklist</strong> section.</li>
                            <li>If multiple assets with different checklists are assigned to the same job, the operator will see all applicable checklists grouped by asset.</li>
                            <li>If no checklists are configured for an asset type, the operator will simply skip that section.</li>
                        </ul>
                        <p className="bg-blue-50 border border-blue-100 text-blue-900 p-3 rounded italic">
                            <strong>Note:</strong> Currently, if an asset type contains the word "Crane", the docket will also automatically reveal the Load Calculations section.
                        </p>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsExplainChecklistOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                            Got it
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
