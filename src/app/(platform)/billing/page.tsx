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
import { Checkbox } from "@/components/ui/checkbox";

interface Docket {
    id: string;
    job_id: string;
    date: string;
    machine_hours: number;
    operator_hours: number;
    jobs: {
        customer_id: string;
        customers: { name: string; email: string; payment_terms_days: number | null };
        po_number: string | null;
    };
    docket_line_items?: any[];
}

export default function BillingPage() {
    const [dockets, setDockets] = useState<Docket[]>([]);
    const [selectedDocketIds, setSelectedDocketIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setIsLoading(true);
        setDockets([]);

        const { data: docketsData } = await createClient()
            .from("site_dockets")
            .select(`
                id, date, job_id, machine_hours, operator_hours,
                jobs (
                    po_number,
                    customers (
                        name, email, payment_terms_days
                    )
                ),
                docket_line_items (
                    inventory_code, description, quantity, unit_rate, is_taxable
                )
            `)
            .eq("is_locked", true)
            .order("date", { ascending: false });

        if (docketsData) {
            setDockets(docketsData as any);
        }

        setIsLoading(false);
    }

    const toggleDocketSelection = (id: string) => {
        const newSet = new Set(selectedDocketIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedDocketIds(newSet);
    };

    const toggleAll = () => {
        if (selectedDocketIds.size === dockets.length) {
            setSelectedDocketIds(new Set());
        } else {
            setSelectedDocketIds(new Set(dockets.map(d => d.id)));
        }
    };

    const handleExportXero = async () => {
        if (selectedDocketIds.size === 0) {
            alert("Please select at least one docket to export.");
            return;
        }

        try {
            // get global settings
            const { data: ps } = await createClient().from('platform_settings').select('default_payment_terms_days').eq('id', 'global').single();
            const defaultTerms = ps?.default_payment_terms_days || 30;

            const docketsToExport = dockets.filter(d => selectedDocketIds.has(d.id));

            // Xero CSV Headers
            const headers = [
                "ContactName", "EmailAddress", "POAddressLine1", "POAddressLine2", "POAddressLine3", "POAddressLine4",
                "POCity", "PORegion", "POPostalCode", "POCountry", "InvoiceNumber", "Reference", "InvoiceDate", "DueDate",
                "InventoryItemCode", "Description", "Quantity", "UnitAmount", "AccountCode", "TaxType"
            ];

            let csvContent = headers.join(",") + "\n";

            docketsToExport.forEach((docket: any) => {
                const customer = docket.jobs?.customers;
                const contactName = customer?.name || "Unknown Customer";
                const email = customer?.email || "";
                const terms = customer?.payment_terms_days || defaultTerms;

                const invoiceDate = new Date(docket.date);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + terms);

                const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

                const invoiceNum = "INV-" + docket.id.split('-')[0].toUpperCase();
                const reference = docket.jobs?.po_number || docket.job_id.split('-')[0].toUpperCase();

                const lines = docket.docket_line_items || [];

                // If no lines found, maybe add a default line for legacy machine/operator hours
                if (lines.length === 0) {
                    if (docket.machine_hours > 0) {
                        lines.push({ inventory_code: 'MACHINE', description: 'Machine Hours', quantity: docket.machine_hours, unit_rate: 0, is_taxable: true });
                    }
                    if (docket.operator_hours > 0) {
                        lines.push({ inventory_code: 'LABOUR', description: 'Operator Hours', quantity: docket.operator_hours, unit_rate: 0, is_taxable: true });
                    }
                }

                lines.forEach((line: any) => {
                    const row = [
                        `"${contactName.replace(/"/g, '""')}"`,
                        email,
                        "", "", "", "", "", "", "", "", // Address fields blank
                        invoiceNum,
                        reference,
                        formatDate(invoiceDate),
                        formatDate(dueDate),
                        line.inventory_code || "ITEM",
                        `"${(line.description || "Service").replace(/"/g, '""')}"`,
                        line.quantity || 0,
                        line.unit_rate || 0,
                        "200", // Standard Sales Account in Xero
                        line.is_taxable ? "GST on Income" : "BASE"
                    ];
                    csvContent += row.join(",") + "\n";
                });
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `xero_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error(error);
            alert("Export failed.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing & Export</h1>
                    <p className="mt-2 text-gray-600">
                        Review completed dockets and batch export to billing software.
                    </p>
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={handleExportXero}
                        disabled={selectedDocketIds.size === 0}
                        className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm", selectedDocketIds.size > 0 ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed")}
                    >
                        Export Selected to Xero ({selectedDocketIds.size})
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={dockets.length > 0 && selectedDocketIds.size === dockets.length}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead className="text-right">Line Items</TableHead>
                                    <TableHead className="text-right">Total ($)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            Loading completed dockets...
                                        </TableCell>
                                    </TableRow>
                                ) : dockets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No completed dockets found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    dockets.map((docket) => {
                                        const totalAmount = docket.docket_line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_rate), 0) || 0;

                                        return (
                                            <TableRow key={docket.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedDocketIds.has(docket.id)}
                                                        onCheckedChange={() => toggleDocketSelection(docket.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>{new Date(docket.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{docket.jobs?.customers?.name || "Unknown"}</TableCell>
                                                <TableCell>{docket.jobs?.po_number || <span className="text-gray-400 italic">None</span>}</TableCell>
                                                <TableCell className="text-right">{docket.docket_line_items?.length || 0}</TableCell>
                                                <TableCell className="text-right font-medium">${totalAmount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/docket?jobId=${docket.job_id}`} target="_blank" className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none bg-blue-50 text-blue-700 hover:text-white border border-blue-200 shadow-sm hover:bg-blue-600 h-7 px-3">
                                                        Review Docket
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
