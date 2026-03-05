"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2 } from "lucide-react";

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    billing_address: string;
    payment_terms_days: number;
}

interface CustomerFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer?: Customer | null;
}

export function CustomerForm({ isOpen, onClose, onSuccess, customer }: CustomerFormProps) {
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: "",
        email: "",
        phone: "",
        billing_address: "",
        payment_terms_days: 30,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Deletion State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (customer) {
                setFormData({
                    name: customer.name,
                    email: customer.email || "",
                    phone: customer.phone || "",
                    billing_address: customer.billing_address || "",
                    payment_terms_days: customer.payment_terms_days || 30,
                });
            } else {
                setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    billing_address: "",
                    payment_terms_days: 30,
                });
            }
        }
    }, [isOpen, customer]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...formData,
        };

        let error;
        if (customer?.id) {
            const { error: updateError } = await createClient()
                .from("customers")
                .update(payload)
                .eq("id", customer.id);
            error = updateError;
        } else {
            const { error: insertError } = await createClient()
                .from("customers")
                .insert([payload]);
            error = insertError;
        }

        setIsSubmitting(false);
        if (!error) {
            onSuccess();
            onClose();
        } else {
            alert("Error saving customer: " + error.message);
        }
    }

    async function handleDelete() {
        if (!customer?.id) return;
        setIsDeleting(true);
        const { error } = await createClient().from("customers").delete().eq("id", customer.id);
        setIsDeleting(false);

        if (!error) {
            setIsDeleteDialogOpen(false);
            onSuccess();
            onClose();
        } else {
            alert("Error deleting customer: " + error.message);
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Customer Name / Company</label>
                            <input
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Billing Address</label>
                            <textarea
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.billing_address}
                                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Payment Terms (Days)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={formData.payment_terms_days}
                                onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full pt-4 border-t mt-4">
                            {customer ? (
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
                                    {isSubmitting ? "Saving..." : "Save Customer"}
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
                title="Delete Customer"
                entityName={customer?.name || "this customer"}
                isDeleting={isDeleting}
            />
        </>
    );
}
