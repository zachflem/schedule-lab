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
import { CustomerForm } from "@/components/customers/CustomerForm";
import { Edit2, Mail, Phone } from "lucide-react";

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    billing_address: string;
    payment_terms_days: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        setIsLoading(true);
        const { data, error } = await createClient()
            .from("customers")
            .select("*")
            .order("name");

        if (data) {
            setCustomers(data);
        }
        setIsLoading(false);
    }

    function handleEdit(customer: Customer) {
        setEditingCustomer(customer);
        setIsFormOpen(true);
    }

    function handleAdd() {
        setEditingCustomer(null);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="mt-2 text-gray-600">
                        Manage company profiles, billing information, and contact details.
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                >
                    + Add Customer
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Billing Address</TableHead>
                            <TableHead>Terms (Days)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    Loading customers...
                                </TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    No customers found. Click "+ Add Customer" to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium text-gray-900">
                                        {customer.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col space-y-1">
                                            {customer.email && (
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Mail className="h-3 w-3 mr-1" /> {customer.email}
                                                </div>
                                            )}
                                            {customer.phone && (
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500 max-w-xs truncate">
                                        {customer.billing_address || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold text-gray-700">
                                        {customer.payment_terms_days || 30}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                                title="Edit Customer"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CustomerForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchCustomers}
                customer={editingCustomer}
            />
        </div>
    );
}
