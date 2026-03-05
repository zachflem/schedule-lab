"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { Trash2, Mail, KeyRound } from "lucide-react";
import { inviteUser, resetUserPassword } from "@/app/actions/userManagement";

const ROLES = ["Administrator", "Dispatcher", "Operator"];

interface Qualification {
    id: string;
    name: string;
}

interface PersonnelQualification {
    qualification_id: string;
    expiry_date: string | null;
}

interface Personnel {
    id: string;
    name: string;
    email?: string;
    can_login?: boolean;
    role: string[];
    active_role: string;
    qualifications?: PersonnelQualification[];
}

interface PersonnelFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    person?: Personnel | null;
}

export function PersonnelForm({ isOpen, onClose, onSuccess, person }: PersonnelFormProps) {
    const [formData, setFormData] = useState<Partial<Personnel>>({
        name: "",
        email: "",
        can_login: false,
        role: ["Operator"],
        active_role: "Operator",
    });
    const [selectedQuals, setSelectedQuals] = useState<PersonnelQualification[]>([]);
    const [availableQualifications, setAvailableQualifications] = useState<Qualification[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Deletion State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form Actions State
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    useEffect(() => {
        setActionMessage(null);
        if (isOpen) {
            fetchQualifications();
            if (person) {
                setFormData({
                    name: person.name,
                    email: person.email || "",
                    can_login: person.can_login || false,
                    role: person.role,
                    active_role: person.active_role,
                });
                fetchPersonQualifications(person.id);
            } else {
                setFormData({
                    name: "",
                    email: "",
                    can_login: false,
                    role: ["Operator"],
                    active_role: "Operator",
                });
                setSelectedQuals([]);
            }
        }
    }, [isOpen, person]);

    async function fetchQualifications() {
        const { data } = await createClient().from("qualifications").select("*").order("name");
        if (data) setAvailableQualifications(data);
    }

    async function fetchPersonQualifications(personId: string) {
        const { data } = await createClient()
            .from("personnel_qualifications")
            .select("qualification_id, expiry_date")
            .eq("personnel_id", personId);
        if (data) setSelectedQuals(data);
    }

    const toggleRole = (role: string) => {
        const currentRoles = formData.role || [];
        if (currentRoles.includes(role)) {
            setFormData({ ...formData, role: currentRoles.filter((r: string) => r !== role) });
        } else {
            setFormData({ ...formData, role: [...currentRoles, role] });
        }
    };

    const toggleQualification = (qualId: string) => {
        if (selectedQuals.some((q: PersonnelQualification) => q.qualification_id === qualId)) {
            setSelectedQuals(selectedQuals.filter((q: PersonnelQualification) => q.qualification_id !== qualId));
        } else {
            setSelectedQuals([...selectedQuals, { qualification_id: qualId, expiry_date: null }]);
        }
    };

    const updateQualExpiry = (qualId: string, expiry: string) => {
        setSelectedQuals(selectedQuals.map((q: PersonnelQualification) =>
            q.qualification_id === qualId ? { ...q, expiry_date: expiry || null } : q
        ));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const personPayload = {
            name: formData.name,
            email: formData.email || null,
            can_login: formData.can_login || false,
            role: formData.role,
            active_role: formData.active_role,
        };

        let personId = person?.id;
        let error;

        if (personId) {
            const { error: updateError } = await createClient()
                .from("personnel")
                .update(personPayload)
                .eq("id", personId);
            error = updateError;
        } else {
            const { data, error: insertError } = await createClient()
                .from("personnel")
                .insert([personPayload])
                .select()
                .single();
            error = insertError;
            if (data) personId = data.id;
        }

        setIsSubmitting(false);
        if (!error) {
            onSuccess();
            onClose();
        } else {
            alert("Error saving staff member: " + error.message);
        }
    }

    async function handleDelete() {
        if (!person?.id) return;
        setIsDeleting(true);
        const { error } = await createClient().from("personnel").delete().eq("id", person.id);
        setIsDeleting(false);

        if (!error) {
            setIsDeleteDialogOpen(false);
            onSuccess();
            onClose();
        } else {
            alert("Error deleting staff member: " + error.message);
        }
    }

    async function handleInviteUser() {
        if (!person?.id || !formData.email) return;

        setActionMessage(null);
        setIsSubmitting(true);
        const res = await inviteUser(formData.email, person.id);
        setIsSubmitting(false);

        if (res.error) setActionMessage({ type: "error", text: res.error });
        else setActionMessage({ type: "success", text: "Invite sent successfully." });
    }

    async function handleResetPassword() {
        if (!formData.email) return;

        setActionMessage(null);
        setIsSubmitting(true);
        const res = await resetUserPassword(formData.email);
        setIsSubmitting(false);

        if (res.error) setActionMessage({ type: "error", text: res.error });
        else setActionMessage({ type: "success", text: "Password reset link sent." });
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{person ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Basic Info & Access Roles</h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Full Name</label>
                                    <input
                                        required
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Email Address</label>
                                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 bg-blue-50 px-2 py-1 rounded cursor-pointer border border-blue-100 hover:bg-blue-100 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={!!formData.can_login}
                                                onChange={(e) => setFormData({ ...formData, can_login: e.target.checked })}
                                                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Can Login</span>
                                        </label>
                                    </div>
                                    <input
                                        type="email"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
                                        value={formData.email || ""}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="user@example.com"
                                        disabled={!formData.can_login}
                                        required={formData.can_login}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Display Role</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.active_role}
                                        onChange={(e) => setFormData({ ...formData, active_role: e.target.value })}
                                    >
                                        {ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Platform Permissions</label>
                                    <div className="space-y-2 pt-1">
                                        {ROLES.map(role => (
                                            <label key={role} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.role?.includes(role)}
                                                    onChange={() => toggleRole(role)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Current Qualifications</h3>
                                <div className="space-y-3 pt-1">
                                    {person ? (
                                        selectedQuals.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedQuals.map((qual) => {
                                                    const matchedDef = availableQualifications.find(q => q.id === qual.qualification_id);
                                                    return (
                                                        <div key={qual.qualification_id} className="p-2 border rounded-md bg-gray-50 border-gray-200 flex justify-between items-center">
                                                            <span className="font-medium text-gray-800 text-sm">{matchedDef?.name || "Unknown"}</span>
                                                            <span className="text-xs text-gray-500 font-mono">
                                                                {qual.expiry_date ? `Exp: ${qual.expiry_date}` : 'No Expiry'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                <p className="text-xs text-blue-600 italic mt-2">Manage these via the Shield icon on the previous screen.</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic p-4 text-center border border-dashed rounded bg-gray-50">
                                                No qualifications assigned.<br />
                                                <span className="text-xs text-gray-400">Use the Shield icon to add compliance records.</span>
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-sm text-gray-500 italic p-4 text-center border border-dashed rounded bg-gray-50">
                                            Save the staff member first to manage their professional qualifications.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* User Account Actions - Only show if Person exists and Can Login is checked */}
                            {person && formData.can_login && formData.email && (
                                <div className="space-y-4 md:col-span-2 border-t pt-4 mt-2">
                                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Account & Security Status</h3>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        <p className="text-xs text-gray-600 flex-1">
                                            This user is authorized to login to the platform using: <span className="font-semibold text-gray-800">{formData.email}</span>
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleInviteUser}
                                                disabled={isSubmitting}
                                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                            >
                                                <Mail className="h-3.5 w-3.5" /> {person.email ? "Resend Invite" : "Send Invite"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleResetPassword}
                                                disabled={isSubmitting}
                                                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                            >
                                                <KeyRound className="h-3.5 w-3.5" /> Password Reset
                                            </button>
                                        </div>
                                    </div>
                                    {actionMessage && (
                                        <div className={`p-2 rounded text-xs mt-2 ${actionMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                            {actionMessage.text}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4 border-t flex flex-row items-center justify-between sm:justify-between w-full mt-6">
                            {person ? (
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
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
                                >
                                    {isSubmitting ? "Saving..." : "Save Staff"}
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
                title="Delete Staff Member"
                entityName={person?.name || "this staff member"}
                isDeleting={isDeleting}
            />
        </>
    );
}
