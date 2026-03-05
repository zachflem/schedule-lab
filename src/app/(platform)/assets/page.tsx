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

import { AssetForm } from "@/components/assets/AssetForm";
import { MaintenanceManager } from "@/components/assets/MaintenanceManager";
import { Edit2, Wrench } from "lucide-react";

interface Asset {
    id: string;
    name: string;
    asset_type_id: string;
    required_qualification_id: string;
    category: string;
    asset_types: { name: string } | null;
    qualifications: { name: string } | null;
    total_hours_run: number;
    cranesafe_expiry: string;
    rego_expiry: string;
    insurance_expiry: string;
    rate_after_hours: number;
    rate_dry_hire: number;
    required_operators: number;
    current_machine_hours: number;
    current_odometer: number;
    service_interval_type: string;
    service_interval_value: number;
    last_service_meter_reading: number;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Maintenance State
    const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
    const [maintenanceAsset, setMaintenanceAsset] = useState<Asset | null>(null);

    useEffect(() => {
        fetchAssets();
    }, []);

    async function fetchAssets() {
        setIsLoading(true);
        const { data, error } = await createClient()
            .from("assets")
            .select("*, asset_types(name), qualifications(name)")
            .order("name");

        if (data) {
            setAssets(data as any);
        }
        setIsLoading(false);
    }

    function handleEdit(asset: Asset) {
        setEditingAsset(asset);
        setIsFormOpen(true);
    }

    function handleAdd() {
        setEditingAsset(null);
        setIsFormOpen(true);
    }

    function handleMaintenance(asset: Asset) {
        setMaintenanceAsset(asset);
        setIsMaintenanceOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Asset Fleet</h1>
                    <p className="mt-2 text-gray-600">
                        Manage machines, trucks, and other equipment metrics.
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                >
                    + Add Asset
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Category/Size</TableHead>
                            <TableHead className="text-right">Meter Reading</TableHead>
                            <TableHead>Service Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                    Loading fleet data...
                                </TableCell>
                            </TableRow>
                        ) : assets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                </TableCell>
                            </TableRow>
                        ) : (
                            assets.map((asset) => {
                                const isOdometer = asset.service_interval_type === 'odometer';
                                const currentMeter = isOdometer ? (asset.current_odometer || 0) : (asset.current_machine_hours || 0);
                                const lastService = asset.last_service_meter_reading || 0;
                                const interval = asset.service_interval_value || (isOdometer ? 10000 : 250);
                                const units = isOdometer ? 'km' : 'hrs';

                                const meterSinceService = currentMeter - lastService;
                                const progressPct = Math.min((meterSinceService / interval) * 100, 100);
                                const isWarning = progressPct >= 90;
                                const isOverdue = currentMeter >= (lastService + interval);

                                return (
                                    <TableRow key={asset.id} className={isOverdue ? "bg-red-50/50" : ""}>
                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                        <TableCell>{asset.asset_types?.name || "Uncategorized"}</TableCell>
                                        <TableCell>{asset.category || "-"}</TableCell>
                                        <TableCell className="text-right text-sm">
                                            <span className="font-bold text-gray-900">{currentMeter.toLocaleString()}</span> {units}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 w-32">
                                                <div className="flex justify-between text-[10px] font-medium">
                                                    <span className={isOverdue ? "text-red-700 font-bold" : isWarning ? "text-amber-600 font-bold" : "text-gray-500"}>
                                                        {isOverdue ? "OVERDUE" : isWarning ? "Due Soon" : "Healthy"}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {Math.round(meterSinceService)} / {interval}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-500'}`}
                                                        style={{ width: `${progressPct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right border-l">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleMaintenance(asset)}
                                                    className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                                                    title="Maintenance Logs"
                                                >
                                                    <Wrench className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(asset)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                                    title="Edit Asset"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <AssetForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchAssets}
                asset={editingAsset}
            />

            <MaintenanceManager
                isOpen={isMaintenanceOpen}
                onClose={() => setIsMaintenanceOpen(false)}
                asset={maintenanceAsset}
            />
        </div>
    );
}
