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

import { PersonnelForm } from "@/components/personnel/PersonnelForm";
import { LicenseManager } from "@/components/personnel/LicenseManager";
import { Edit2, ShieldCheck, AlertTriangle } from "lucide-react";

interface PersonnelQualification {
    qualification_id: string;
    expiry_date: string;
}

interface Personnel {
    id: string;
    name: string;
    email?: string;
    can_login?: boolean;
    role: string[];
    active_role: string;
    personnel_qualifications?: PersonnelQualification[];
    hasExpiringLicense?: boolean;
}

export default function PersonnelPage() {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);
    const [licensingPerson, setLicensingPerson] = useState<{ id: string; name: string } | null>(null);
    const [isLicenseManagerOpen, setIsLicenseManagerOpen] = useState(false);

    useEffect(() => {
        fetchPersonnel();
    }, []);

    async function fetchPersonnel() {
        setIsLoading(true);
        const { data: personnelData, error } = await createClient()
            .from("personnel")
            .select("*, personnel_qualifications(qualification_id, expiry_date)")
            .order("name");

        if (personnelData) {
            const enrichedPersonnel = personnelData.map(person => {
                const now = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);

                let hasExpiringLicense = false;
                if (person.personnel_qualifications && person.personnel_qualifications.length > 0) {
                    hasExpiringLicense = person.personnel_qualifications.some((q: any) => {
                        if (!q.expiry_date) return false;
                        const expiry = new Date(q.expiry_date);
                        return expiry <= thirtyDaysFromNow;
                    });
                }

                return { ...person, hasExpiringLicense };
            });
            setPersonnel(enrichedPersonnel);
        }
        setIsLoading(false);
    }

    function handleEdit(person: Personnel) {
        setEditingPerson(person);
        setIsFormOpen(true);
    }

    function handleManageLicenses(person: Personnel) {
        setLicensingPerson({ id: person.id, name: person.name });
        setIsLicenseManagerOpen(true);
    }

    function handleAdd() {
        setEditingPerson(null);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Personnel & HR</h1>
                    <p className="mt-2 text-gray-600">
                        Manage staff roles, qualifications, and HRWL expiries.
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                >
                    + Add Staff
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Active Role</TableHead>
                            <TableHead>Available Roles</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    Loading personnel data...
                                </TableCell>
                            </TableRow>
                        ) : personnel.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    No staff found. Click "+ Add Staff" to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            personnel.map((person) => (
                                <TableRow key={person.id} className={person.hasExpiringLicense ? "bg-red-50/30" : ""}>
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            {person.name}
                                            {person.hasExpiringLicense && (
                                                <div title="Has expiring or expired compliance records">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                            {person.active_role}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-xs">
                                        {person.role.join(", ")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(person)}
                                                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                                title="Edit Staff"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                className="p-2 text-blue-600 hover:text-blue-800 transition-colors relative"
                                                title="Manage Licenses"
                                                onClick={() => handleManageLicenses(person)}
                                            >
                                                <ShieldCheck className="h-4 w-4" />
                                                {person.personnel_qualifications && person.personnel_qualifications.length > 0 && (
                                                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                                                        {person.hasExpiringLicense ? (
                                                            <>
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                            </>
                                                        ) : (
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                                                        )}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <PersonnelForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchPersonnel}
                person={editingPerson}
            />

            <LicenseManager
                isOpen={isLicenseManagerOpen}
                onClose={() => {
                    setIsLicenseManagerOpen(false);
                    fetchPersonnel(); // Refresh to catch any new expiry warnings
                }}
                person={licensingPerson}
            />
        </div>
    );
}
