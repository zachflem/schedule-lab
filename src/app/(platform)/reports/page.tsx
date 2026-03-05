"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    BarChart3, Calendar as CalendarIcon, FileDown,
    Droplets, AlertTriangle, Truck, Clock, ShieldAlert,
    Wrench, Users, Briefcase, UserCheck, DollarSign,
    History, CheckCircle
} from "lucide-react";
import moment from "moment";

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [reportType, setReportType] = useState("fleet");
    const [dateFrom, setDateFrom] = useState(moment().startOf('month').format("YYYY-MM-DD"));
    const [dateTo, setDateTo] = useState(moment().endOf('month').format("YYYY-MM-DD"));

    const [fleetData, setFleetData] = useState<any>(null);
    const [personnelData, setPersonnelData] = useState<any>(null);
    const [assetData, setAssetData] = useState<any>(null);
    const [detailedPersonnelData, setDetailedPersonnelData] = useState<any>(null);

    // Selectors for specific reports
    const [allAssets, setAllAssets] = useState<any[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");

    const [allPersonnel, setAllPersonnel] = useState<any[]>([]);
    const [selectedPersonnelId, setSelectedPersonnelId] = useState("");

    // Load dropdown data
    useEffect(() => {
        const fetchDropdowns = async () => {
            const { data: assetsData } = await createClient().from("assets").select("id, name");
            if (assetsData) setAllAssets(assetsData);

            const { data: personnelData } = await createClient().from("personnel").select("id, name");
            if (personnelData) setAllPersonnel(personnelData);
        };
        fetchDropdowns();
    }, []);

    const generateReport = async () => {
        setIsLoading(true);

        if (reportType === "fleet") {
            await generateFleetReport();
        } else if (reportType === "personnel") {
            await generatePersonnelReport();
        } else if (reportType === "asset" && selectedAssetId) {
            await generateAssetReport();
        } else if (reportType === "detailed_personnel" && selectedPersonnelId) {
            await generateDetailedPersonnelReport();
        }
        setIsLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const generateFleetReport = async () => {
        // 1. Fetch Assets
        const { data: assets } = await createClient().from("assets").select("*");

        // 2. Fetch Dockets for Fuel/Hours in date range
        const { data: dockets } = await createClient()
            .from("site_dockets")
            .select("fuel, machine_hours")
            .gte("date", dateFrom)
            .lte("date", dateTo);

        // 3. Maintenance Logs for costs
        const { data: maintenance } = await createClient()
            .from("asset_maintenance_logs")
            .select("cost")
            .gte("service_date", dateFrom)
            .lte("service_date", dateTo);

        let totalFuel = 0;
        let totalMachineHours = 0;
        if (dockets) {
            totalFuel = dockets.reduce((acc, curr) => acc + Number(curr.fuel || 0), 0);
            totalMachineHours = dockets.reduce((acc, curr) => acc + Number(curr.machine_hours || 0), 0);
        }

        let totalMaintenanceCost = 0;
        if (maintenance) {
            totalMaintenanceCost = maintenance.reduce((acc, curr) => acc + Number(curr.cost || 0), 0);
        }

        // Expiries & Maintenance (next 30 days)
        const next30Days = moment().add(30, 'days');
        const expiringRego = assets?.filter(a => a.rego_expiry && moment(a.rego_expiry).isBefore(next30Days)) || [];
        const expiringInsurance = assets?.filter(a => a.insurance_expiry && moment(a.insurance_expiry).isBefore(next30Days)) || [];
        const expiringCranesafe = assets?.filter(a => a.cranesafe_expiry && moment(a.cranesafe_expiry).isBefore(next30Days)) || [];

        // Impending services (within 50 hours of interval)
        const impendingServices = assets?.filter(a => {
            if (a.service_interval_type === 'hours' && a.current_machine_hours && a.service_interval_value) {
                const hoursSinceService = a.current_machine_hours - (a.last_service_meter_reading || 0);
                return (a.service_interval_value - hoursSinceService) < 50;
            }
            return false;
        }) || [];

        setFleetData({
            totalAssets: assets?.length || 0,
            totalFuel,
            totalMachineHours,
            totalMaintenanceCost,
            expiringRego,
            expiringInsurance,
            expiringCranesafe,
            impendingServices
        });
    };

    const generatePersonnelReport = async () => {
        // 1. Fetch Personnel
        const { data: personnel } = await createClient().from("personnel").select("*");

        // 2. Fetch all Operator Hours from Dockets in range
        const { data: dockets } = await createClient()
            .from("site_dockets")
            .select("operator_hours")
            .gte("date", dateFrom)
            .lte("date", dateTo);

        // 3. Fetch all active Personnel Qualifications to check expiries
        const next30Days = moment().add(30, 'days');

        const { data: pQuals } = await createClient()
            .from("personnel_qualifications")
            .select("*, personnel(name), qualifications(name)")
            .lte("expiry_date", next30Days.toISOString());

        let totalOperatorHours = 0;
        if (dockets) {
            totalOperatorHours = dockets.reduce((acc, curr) => acc + Number(curr.operator_hours || 0), 0);
        }

        const expiringItems = [
            ...(pQuals?.map(q => ({ ...q, itemName: q.qualifications?.name, type: 'Qualification' })) || [])
        ];

        // Unique Operators who logged hours this period vs Total Operators
        // We'd need to link dockets to personnel to get unique utilization.
        // For MVP high-level, we'll estimate utilization based on total possible working hours.
        const totalStaff = personnel?.length || 0;
        const potentialHours = totalStaff * 40 * 4; // Approx 160h/month per person
        const utilizationRate = potentialHours > 0 ? (totalOperatorHours / potentialHours) * 100 : 0;

        setPersonnelData({
            totalStaff,
            totalOperatorHours,
            utilizationRate,
            expiringItems: expiringItems.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
        });
    };

    const generateAssetReport = async () => {
        // 1. Fetch Asset Details
        const { data: asset } = await createClient().from("assets").select("*, asset_types(name)").eq("id", selectedAssetId).single();
        if (!asset) return;

        // 2. Fetch Maintenance Logs in range
        const { data: maintenance } = await createClient()
            .from("asset_maintenance_logs")
            .select("*")
            .eq("asset_id", selectedAssetId)
            .gte("service_date", dateFrom)
            .lte("service_date", dateTo)
            .order("service_date", { ascending: false });

        // 3. Fetch Dockets (Revenue/Hours/Fuel) in range
        const { data: dockets } = await createClient()
            .from("site_dockets")
            .select(`
                id, date, machine_hours, fuel,
                jobs (
                    id, job_type, pricing
                )
            `)
            .eq("is_locked", true)
            .gte("date", dateFrom)
            .lte("date", dateTo);

        // Calculate metrics
        let totalFuel = 0;
        let totalMachineHours = 0;
        let estimatedRevenue = 0; // Simplified ROI calculation

        let docketList: any[] = [];

        if (dockets) {
            totalFuel = dockets.reduce((acc, curr) => acc + Number(curr.fuel || 0), 0);
            totalMachineHours = dockets.reduce((acc, curr) => acc + Number(curr.machine_hours || 0), 0);

            dockets.forEach((d: any) => {
                if (d.jobs?.pricing) {
                    // Very rough estimate of revenue matching for MVP
                    estimatedRevenue += Number(d.jobs.pricing) || 0;
                }
            });

            // For the history board, filter down to unique dockets with actual run hours
            docketList = dockets.filter(d => d.machine_hours && d.machine_hours > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        let totalMaintenanceCost = 0;
        if (maintenance) {
            totalMaintenanceCost = maintenance.reduce((acc, curr) => acc + Number(curr.cost || 0), 0);
        }

        setAssetData({
            asset,
            totalFuel,
            totalMachineHours,
            totalMaintenanceCost,
            estimatedRevenue,
            dockets: docketList,
            maintenanceLogs: maintenance || []
        });
    };

    const generateDetailedPersonnelReport = async () => {
        // 1. Fetch Person Details
        const { data: person } = await createClient().from("personnel").select("*").eq("id", selectedPersonnelId).single();
        if (!person) return;

        // 2. Fetch Qualifications
        const { data: pQuals } = await createClient()
            .from("personnel_qualifications")
            .select("*, qualifications(name)")
            .eq("personnel_id", selectedPersonnelId);

        // 3. Fetch Allocations -> Jobs -> Dockets
        const { data: allocations } = await createClient()
            .from("allocations")
            .select(`
                id, 
                start_time, 
                end_time,
                jobs (
                    id, 
                    customer_id, 
                    customers(name),
                    pricing,
                    job_type,
                    location,
                    site_dockets (
                        date,
                        machine_hours,
                        operator_hours,
                        is_locked
                    )
                )
            `)
            .eq("personnel_id", selectedPersonnelId)
            .gte("start_time", dateFrom)
            .lte("start_time", dateTo + 'T23:59:59') // include end of day
            .order("start_time", { ascending: false });

        let totalOperatorHours = 0;
        let allocationList: any[] = [];
        let activeQualsCount = 0;

        if (pQuals) {
            activeQualsCount = pQuals.filter(q => !moment().isAfter(moment(q.expiry_date))).length;
        }

        if (allocations) {
            allocations.forEach((alloc: any) => {
                // Determine dockets for this specific job
                // Note: a job can span multiple days or multiple allocations.
                // We show the operator hours for the specific date of this allocation if available,
                // or overall job stats.
                let allocHours = 0;
                let relatedDockets: any[] = [];

                if (alloc.jobs?.site_dockets) {
                    relatedDockets = alloc.jobs.site_dockets;
                    // Sum up all operator hours from associated dockets for this personnel's job
                    allocHours = relatedDockets.reduce((acc: number, curr: any) => acc + Number(curr.operator_hours || 0), 0);
                    totalOperatorHours += allocHours;
                }

                allocationList.push({
                    ...alloc,
                    calculatedHours: allocHours,
                    dockets: relatedDockets
                });
            });
        }

        setDetailedPersonnelData({
            person,
            qualifications: pQuals || [],
            activeQualsCount,
            allocations: allocationList,
            totalOperatorHours
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8 no-print">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Reports</h1>
                    <p className="text-gray-500 mt-1">Generate insights and overview data for your operations</p>
                </div>
                <button
                    onClick={handlePrint}
                    disabled={isLoading || (!fleetData && !personnelData && !assetData && !detailedPersonnelData)}
                    className="flex items-center px-4 py-2 bg-slate-900 text-white font-bold rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
                >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                </button>
            </div>

            {/* Report Config */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end no-print">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Report Type</label>
                    <select
                        value={reportType}
                        onChange={(e) => {
                            setReportType(e.target.value);
                            setFleetData(null);
                            setPersonnelData(null);
                            setAssetData(null);
                            setDetailedPersonnelData(null);
                        }}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-gray-900 bg-white"
                    >
                        <option value="fleet">Fleet Health Overview</option>
                        <option value="personnel">Personnel Overview</option>
                        <option value="asset">Detailed Asset Report</option>
                        <option value="detailed_personnel">Detailed Personnel Report</option>
                    </select>
                </div>

                {reportType === "asset" && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Asset</label>
                        <select
                            value={selectedAssetId}
                            onChange={(e) => setSelectedAssetId(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-gray-900 bg-white"
                        >
                            <option value="">-- Choose Asset --</option>
                            {allAssets.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {reportType === "detailed_personnel" && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Staff</label>
                        <select
                            value={selectedPersonnelId}
                            onChange={(e) => setSelectedPersonnelId(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-gray-900 bg-white"
                        >
                            <option value="">-- Choose User --</option>
                            {allPersonnel.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-gray-900 bg-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-gray-900 bg-white"
                    />
                </div>
                <div>
                    <button
                        onClick={generateReport}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                        {isLoading ? "Generating..." : "Generate Report"}
                    </button>
                </div>
            </div>

            {/* Report Viewer Container */}
            {fleetData && reportType === "fleet" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center">
                            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
                            Fleet Health Overview
                            <span className="ml-3 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {moment(dateFrom).format("MMM Do YYYY")} - {moment(dateTo).format("MMM Do YYYY")}
                            </span>
                        </h2>
                    </div>

                    {/* Quick Telemetry / Health KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Truck className="h-5 w-5 mr-2 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Assets</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{fleetData.totalAssets}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Droplets className="h-5 w-5 mr-2 text-green-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Fuel Logged (L)</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{fleetData.totalFuel.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Machine Hours</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{fleetData.totalMachineHours.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Wrench className="h-5 w-5 mr-2 text-red-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Maint. Spend</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">${fleetData.totalMaintenanceCost.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Board (Maintenance & Expiries) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Maintenance Action Board */}
                        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                            <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center justify-between">
                                <h3 className="font-bold text-red-900 flex items-center text-sm uppercase tracking-wider">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Service Action Board
                                </h3>
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {fleetData.impendingServices.length} Items
                                </span>
                            </div>
                            <div className="p-0">
                                {fleetData.impendingServices.length === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No impending services detected.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {fleetData.impendingServices.map((asset: any) => {
                                            const hoursSince = asset.current_machine_hours - (asset.last_service_meter_reading || 0);
                                            const remaining = asset.service_interval_value - hoursSince;
                                            return (
                                                <li key={asset.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{asset.name}</p>
                                                        <p className="text-xs text-gray-500">Interval: {asset.service_interval_value} hrs</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${remaining < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {remaining < 0 ? 'OVERDUE' : `DUE IN ${Math.floor(remaining)} hrs`}
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Compliance & Registration */}
                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                            <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center justify-between">
                                <h3 className="font-bold text-orange-900 flex items-center text-sm uppercase tracking-wider">
                                    <ShieldAlert className="h-4 w-4 mr-2" />
                                    Compliance & Expiries (30 Days)
                                </h3>
                                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {fleetData.expiringRego.length + fleetData.expiringInsurance.length + fleetData.expiringCranesafe.length} Items
                                </span>
                            </div>
                            <div className="p-0">
                                {(fleetData.expiringRego.length + fleetData.expiringInsurance.length + fleetData.expiringCranesafe.length) === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No upcoming expiries.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {fleetData.expiringRego.map((asset: any) => (
                                            <li key={`rego-${asset.id}`} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Registration</span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{asset.name}</p>
                                                </div>
                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                    Expires: {moment(asset.rego_expiry).format("MMM Do")}
                                                </span>
                                            </li>
                                        ))}
                                        {fleetData.expiringInsurance.map((asset: any) => (
                                            <li key={`ins-${asset.id}`} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider">Insurance</span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{asset.name}</p>
                                                </div>
                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                    Expires: {moment(asset.insurance_expiry).format("MMM Do")}
                                                </span>
                                            </li>
                                        ))}
                                        {fleetData.expiringCranesafe.map((asset: any) => (
                                            <li key={`crane-${asset.id}`} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-green-500 tracking-wider">Cranesafe</span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">{asset.name}</p>
                                                </div>
                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                    Expires: {moment(asset.cranesafe_expiry).format("MMM Do")}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Personnel Report Viewer Container */}
            {personnelData && reportType === "personnel" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center">
                            <Users className="h-6 w-6 mr-2 text-blue-600" />
                            Personnel Overview
                            <span className="ml-3 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {moment(dateFrom).format("MMM Do YYYY")} - {moment(dateTo).format("MMM Do YYYY")}
                            </span>
                        </h2>
                    </div>

                    {/* Personnel KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Users className="h-5 w-5 mr-2 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Staff</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{personnelData.totalStaff}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Output (Hrs)</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{personnelData.totalOperatorHours.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Est. Utilization</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{personnelData.utilizationRate.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Expiry Action Board */}
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden mt-6">
                        <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center justify-between">
                            <h3 className="font-bold text-orange-900 flex items-center text-sm uppercase tracking-wider">
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Approaching Expiries (30 Days)
                            </h3>
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {personnelData.expiringItems.length} Items
                            </span>
                        </div>
                        <div className="p-0">
                            {personnelData.expiringItems.length === 0 ? (
                                <p className="p-5 text-sm text-gray-500 italic">No upcoming staff expiries.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {personnelData.expiringItems.map((item: any, index: number) => {
                                        const isOverdue = moment().isAfter(moment(item.expiry_date));
                                        return (
                                            <li key={item.id || index} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${item.type === 'License' ? 'text-purple-500' : 'text-blue-500'}`}>
                                                        {item.type}
                                                    </span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                                                        {item.personnel?.name} - {item.itemName}
                                                    </p>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                        {isOverdue ? 'EXPIRED' : `Expires: ${moment(item.expiry_date).format("MMM Do YYYY")}`}
                                                    </span>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Report Viewer Container */}
            {assetData && reportType === "asset" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center">
                            <Truck className="h-6 w-6 mr-2 text-blue-600" />
                            {assetData.asset.name} Overview
                            <span className="ml-3 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {moment(dateFrom).format("MMM Do YYYY")} - {moment(dateTo).format("MMM Do YYYY")}
                            </span>
                        </h2>
                    </div>

                    {/* Asset KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Est. Revenue</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">${assetData.estimatedRevenue.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Billed Hours</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{assetData.totalMachineHours.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Droplets className="h-5 w-5 mr-2 text-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Fuel Logged (L)</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{assetData.totalFuel.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Wrench className="h-5 w-5 mr-2 text-red-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Maint. Spend</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">${assetData.totalMaintenanceCost.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Utilization History  */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase tracking-wider">
                                    <History className="h-4 w-4 mr-2" />
                                    Utilization History
                                </h3>
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {assetData.dockets.length} Dockets
                                </span>
                            </div>
                            <div className="p-0 h-96 overflow-y-auto">
                                {assetData.dockets.length === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No usage logged for this period.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {assetData.dockets.map((docket: any) => (
                                            <li key={docket.id} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">
                                                        {docket.jobs?.job_type || 'General Hire'}
                                                    </span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                                                        {moment(docket.date).format("MMM Do YYYY")}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Hours</p>
                                                        <p className="font-bold text-gray-900">{docket.machine_hours}</p>
                                                    </div>
                                                    {docket.fuel > 0 && (
                                                        <div>
                                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Fuel</p>
                                                            <p className="font-bold text-gray-900">{docket.fuel}L</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Maintenance History */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase tracking-wider">
                                    <Wrench className="h-4 w-4 mr-2" />
                                    Maintenance Logs
                                </h3>
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {assetData.maintenanceLogs.length} Logs
                                </span>
                            </div>
                            <div className="p-0 h-96 overflow-y-auto">
                                {assetData.maintenanceLogs.length === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No maintenance logged for this period.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {assetData.maintenanceLogs.map((log: any) => (
                                            <li key={log.id} className="p-4 hover:bg-gray-50 bg-white">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">
                                                            {moment(log.service_date).format("MMM Do YYYY")}
                                                        </span>
                                                        <p className="font-bold text-gray-900 text-sm mt-0.5">{log.description}</p>
                                                    </div>
                                                    <span className="font-bold text-gray-900 bg-red-50 text-red-700 px-2 py-1 rounded text-xs border border-red-100">
                                                        ${log.cost}
                                                    </span>
                                                </div>
                                                {log.notes && (
                                                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                                                        {log.notes}
                                                    </p>
                                                )}
                                                <div className="mt-2 text-xs text-gray-400 font-medium">
                                                    Meter: {log.meter_reading_at_service} hrs
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Personnel Report Viewer Container */}
            {detailedPersonnelData && reportType === "detailed_personnel" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center">
                            <UserCheck className="h-6 w-6 mr-2 text-blue-600" />
                            {detailedPersonnelData.person.name} Overview
                            <span className="ml-3 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {moment(dateFrom).format("MMM Do YYYY")} - {moment(dateTo).format("MMM Do YYYY")}
                            </span>
                        </h2>
                    </div>

                    {/* Personnel KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <History className="h-5 w-5 mr-2 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Allocations</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{detailedPersonnelData.allocations.length}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Billed Hours</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{detailedPersonnelData.totalOperatorHours.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center text-gray-500 mb-2">
                                <ShieldAlert className="h-5 w-5 mr-2 text-green-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Active Qualifications</span>
                            </div>
                            <span className="text-3xl font-black text-gray-900">{detailedPersonnelData.activeQualsCount} <span className="text-lg text-gray-400 font-normal">/ {detailedPersonnelData.qualifications.length}</span></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Allocation History */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase tracking-wider">
                                    <Briefcase className="h-4 w-4 mr-2" />
                                    Allocation History
                                </h3>
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {detailedPersonnelData.allocations.length} Jobs
                                </span>
                            </div>
                            <div className="p-0 h-96 overflow-y-auto">
                                {detailedPersonnelData.allocations.length === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No allocations logged for this period.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {detailedPersonnelData.allocations.map((alloc: any) => (
                                            <li key={alloc.id} className="p-4 hover:bg-gray-50 flex justify-between items-center bg-white">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">
                                                        {alloc.jobs?.job_type || 'General Hire'}
                                                    </span>
                                                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                                                        {alloc.jobs?.customers?.name || 'Unknown Customer'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {moment(alloc.start_time).format("MMM Do")} - {alloc.jobs?.location || 'No location'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                        {alloc.calculatedHours} Hrs
                                                    </span>
                                                    {alloc.dockets.length > 0 && (
                                                        <span className="text-[10px] text-green-600 mt-1 flex items-center">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            {alloc.dockets.length} Dockets
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Compliance Profile */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase tracking-wider">
                                    <ShieldAlert className="h-4 w-4 mr-2" />
                                    Compliance Profile
                                </h3>
                                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {detailedPersonnelData.qualifications.length} Quals
                                </span>
                            </div>
                            <div className="p-0 h-96 overflow-y-auto">
                                {detailedPersonnelData.qualifications.length === 0 ? (
                                    <p className="p-5 text-sm text-gray-500 italic">No qualifications recorded for this user.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {detailedPersonnelData.qualifications.map((qual: any) => {
                                            const isOverdue = moment().isAfter(moment(qual.expiry_date));
                                            return (
                                                <li key={qual.id} className="p-4 hover:bg-gray-50 bg-white flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider">
                                                            Qualification
                                                        </span>
                                                        <p className="font-bold text-gray-900 text-sm mt-0.5">
                                                            {qual.qualifications?.name}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                            {isOverdue ? 'EXPIRED' : `Valid: ${moment(qual.expiry_date).format("MMM Do YYYY")}`}
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
