"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2 } from "lucide-react";

interface AssetType {
    id: string;
    name: string;
}

interface Qualification {
    id: string;
    name: string;
}

interface Asset {
    id: string;
    name: string;
    asset_type_id: string;
    required_qualification_id: string;
    category: string;
    cranesafe_expiry?: string;
    rego_expiry?: string;
    insurance_expiry?: string;
    rate_hourly?: number | string;
    rate_after_hours?: number | string;
    rate_dry_hire?: number | string;
    required_operators?: number | string;

    // Telemetry Tracking
    current_machine_hours?: number | string;
    current_odometer?: number | string;
    service_interval_type?: string;
    service_interval_value?: number | string;
    last_service_meter_reading?: number | string;
}

interface AssetFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset?: Asset | null;
}

export function AssetForm({ isOpen, onClose, onSuccess, asset }: AssetFormProps) {
    const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
    const [qualifications, setQualifications] = useState<Qualification[]>([]);
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: "",
        asset_type_id: "",
        required_qualification_id: "",
        category: "",
        cranesafe_expiry: "",
        rego_expiry: "",
        insurance_expiry: "",
        rate_hourly: "",
        rate_after_hours: "",
        rate_dry_hire: "",
        required_operators: 1,
        current_machine_hours: 0,
        current_odometer: 0,
        service_interval_type: "hours",
        service_interval_value: 250,
        last_service_meter_reading: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Deletion State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAssetTypes();
            fetchQualifications();
            if (asset) {
                setFormData({
                    name: asset.name,
                    asset_type_id: asset.asset_type_id,
                    required_qualification_id: asset.required_qualification_id || "",
                    category: asset.category,
                    cranesafe_expiry: asset.cranesafe_expiry?.split('T')[0] || "",
                    rego_expiry: asset.rego_expiry?.split('T')[0] || "",
                    insurance_expiry: asset.insurance_expiry?.split('T')[0] || "",
                    rate_hourly: asset.rate_hourly || "",
                    rate_after_hours: asset.rate_after_hours || "",
                    rate_dry_hire: asset.rate_dry_hire || "",
                    required_operators: asset.required_operators || 1,
                    current_machine_hours: asset.current_machine_hours || 0,
                    current_odometer: asset.current_odometer || 0,
                    service_interval_type: asset.service_interval_type || "hours",
                    service_interval_value: asset.service_interval_value || 250,
                    last_service_meter_reading: asset.last_service_meter_reading || 0,
                });
            } else {
                setFormData({
                    name: "",
                    asset_type_id: "",
                    required_qualification_id: "",
                    category: "",
                    cranesafe_expiry: "",
                    rego_expiry: "",
                    insurance_expiry: "",
                    rate_hourly: "",
                    rate_after_hours: "",
                    rate_dry_hire: "",
                    required_operators: 1,
                    current_machine_hours: 0,
                    current_odometer: 0,
                    service_interval_type: "hours",
                    service_interval_value: 250,
                    last_service_meter_reading: 0,
                });
            }
        }
    }, [isOpen, asset]);

    async function fetchAssetTypes() {
        const { data } = await createClient()
            .from("asset_types")
            .select("id, name")
            .order("name");
        if (data) setAssetTypes(data);
    }

    async function fetchQualifications() {
        const { data } = await createClient()
            .from("qualifications")
            .select("id, name")
            .order("name");
        if (data) setQualifications(data);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...formData,
            required_qualification_id: formData.required_qualification_id || null,
            // Ensure empty strings are treated as null for numeric/date fields
            cranesafe_expiry: formData.cranesafe_expiry || null,
            rego_expiry: formData.rego_expiry || null,
            insurance_expiry: formData.insurance_expiry || null,
            rate_hourly: formData.rate_hourly === "" ? null : formData.rate_hourly,
            rate_after_hours: formData.rate_after_hours === "" ? null : formData.rate_after_hours,
            rate_dry_hire: formData.rate_dry_hire === "" ? null : formData.rate_dry_hire,
            required_operators: formData.required_operators === "" ? 1 : formData.required_operators,

            current_machine_hours: formData.current_machine_hours === "" ? 0 : formData.current_machine_hours,
            current_odometer: formData.current_odometer === "" ? 0 : formData.current_odometer,
            service_interval_type: formData.service_interval_type || 'hours',
            service_interval_value: formData.service_interval_value === "" ? 250 : formData.service_interval_value,
            last_service_meter_reading: formData.last_service_meter_reading === "" ? 0 : formData.last_service_meter_reading,
        };

        let error;
        if (asset?.id) {
            const { error: updateError } = await createClient()
                .from("assets")
                .update(payload)
                .eq("id", asset.id);
            error = updateError;
        } else {
            const { error: insertError } = await createClient()
                .from("assets")
                .insert([payload]);
            error = insertError;
        }

        setIsSubmitting(false);
        if (!error) {
            onSuccess();
            onClose();
        } else {
            alert("Error saving asset: " + error.message);
        }
    }

    async function handleDelete() {
        if (!asset?.id) return;
        setIsDeleting(true);
        const { error } = await createClient().from("assets").delete().eq("id", asset.id);
        setIsDeleting(false);

        if (!error) {
            setIsDeleteDialogOpen(false);
            onSuccess();
            onClose();
        } else {
            alert("Error deleting asset: " + error.message);
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4 overflow-y-auto max-h-[80vh] px-1">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Name</label>
                            <input
                                required
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Type</label>
                            <select
                                required
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.asset_type_id}
                                onChange={(e) => setFormData({ ...formData, asset_type_id: e.target.value })}
                            >
                                <option value="">Select a type...</option>
                                {assetTypes.map((type) => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 px-4">Pricing & Operations</h4>
                            <div className="grid grid-cols-2 gap-4 px-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">Hourly Rate ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                        value={formData.rate_hourly}
                                        onChange={(e) => setFormData({ ...formData, rate_hourly: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">After Hours Rate (+ $)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                        value={formData.rate_after_hours}
                                        onChange={(e) => setFormData({ ...formData, rate_after_hours: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">Dry Hire (Daily $)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                        value={formData.rate_dry_hire}
                                        onChange={(e) => setFormData({ ...formData, rate_dry_hire: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">Required Operators</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                        value={formData.required_operators}
                                        onChange={(e) => setFormData({ ...formData, required_operators: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2 grid grid-cols-4 gap-4 px-4 bg-gray-50 pb-4 rounded-b-lg">
                            <h4 className="col-span-4 text-sm font-bold text-gray-900 mb-2">Telemetry & Maintenance</h4>

                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">Service Interval Type</label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    value={formData.service_interval_type}
                                    onChange={(e) => setFormData({ ...formData, service_interval_type: e.target.value })}
                                >
                                    <option value="hours">Machine Engine Hours</option>
                                    <option value="odometer">Odometer (km)</option>
                                </select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">
                                    Service Interval Target ({formData.service_interval_type === 'odometer' ? 'km' : 'hrs'})
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    value={formData.service_interval_value}
                                    onChange={(e) => setFormData({ ...formData, service_interval_value: e.target.value })}
                                />
                            </div>

                            <div className="col-span-4 grid grid-cols-3 gap-4 pt-2 border-t border-gray-200 border-dashed mt-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">Current Hours</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
                                        value={formData.current_machine_hours}
                                        onChange={(e) => setFormData({ ...formData, current_machine_hours: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">Current Odometer</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
                                        value={formData.current_odometer}
                                        onChange={(e) => setFormData({ ...formData, current_odometer: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase" title="What the meter read when last serviced">Last Service Meter</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white border-blue-200"
                                        value={formData.last_service_meter_reading}
                                        onChange={(e) => setFormData({ ...formData, last_service_meter_reading: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2 grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Req. Qual</label>
                            <select
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.required_qualification_id}
                                onChange={(e) => setFormData({ ...formData, required_qualification_id: e.target.value })}
                            >
                                <option value="">No special qualification required</option>
                                {qualifications.map((qual) => (
                                    <option key={qual.id} value={qual.id}>{qual.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-gray-700">Category/Size</label>
                            <input
                                placeholder="e.g. 20T, 50T, Large"
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Annual Safety</label>
                            <input
                                type="date"
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.cranesafe_expiry}
                                onChange={(e) => setFormData({ ...formData, cranesafe_expiry: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Rego Expiry</label>
                            <input
                                type="date"
                                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.rego_expiry}
                                onChange={(e) => setFormData({ ...formData, rego_expiry: e.target.value })}
                            />
                        </div>
                        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full pt-4 border-t mt-4">
                            {asset ? (
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete
                                </button>
                            ) : (
                                <div></div>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
                                >
                                    {isSubmitting ? "Saving..." : "Save Asset"}
                                </button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Asset"
                entityName={asset?.name || "this asset"}
                isDeleting={isDeleting}
            />
        </>
    );
}
