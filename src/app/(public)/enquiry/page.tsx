"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Truck, CheckCircle2 } from "lucide-react";

interface TenantSettings {
    company_name: string;
    logo_url: string;
    primary_color: string;
}

interface AssetType {
    id: string;
    name: string;
}

export default function PublicEnquiryPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Branding State
    const [branding, setBranding] = useState<TenantSettings | null>(null);

    const [formData, setFormData] = useState({
        customer_name: "",
        contact_email: "",
        contact_phone: "",
        job_details: "",
        location: "",
        preferred_date: "",
        anticipated_hours: "",
        site_inspection_required: false,
        asset_type_id: "",
        po_number: "",
    });

    const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

    useEffect(() => {
        fetchBranding();
        fetchAssetTypes();
    }, []);

    async function fetchAssetTypes() {
        const { data } = await createClient().from("asset_types").select("id, name").order("name");
        if (data) setAssetTypes(data);
    }

    async function fetchBranding() {
        const { data, error } = await createClient()
            .from("platform_settings")
            .select("company_name, logo_url, primary_color")
            .eq("id", "global")
            .single();

        if (data && !error) {
            setBranding(data as TenantSettings);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const sanitizeInput = (input: string) => {
            if (!input) return "";
            return input.replace(/<\/?[^>]+(>|$)/g, "").trim();
        };

        const insertData = {
            ...formData,
            customer_name: sanitizeInput(formData.customer_name),
            contact_email: sanitizeInput(formData.contact_email),
            contact_phone: sanitizeInput(formData.contact_phone),
            location: sanitizeInput(formData.location),
            job_details: sanitizeInput(formData.job_details),
            po_number: formData.po_number ? sanitizeInput(formData.po_number) : null,
            anticipated_hours: formData.anticipated_hours ? parseFloat(formData.anticipated_hours) : null,
            asset_type_id: formData.asset_type_id || null,
        };

        const { error } = await createClient()
            .from("enquiries")
            .insert([insertData]);

        setIsSubmitting(false);
        if (!error) {
            setIsSubmitted(true);
        } else {
            alert("Error submitting enquiry: " + error.message);
        }
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                    <CheckCircle2 className="h-16 w-16 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Enquiry Received!</h1>
                <p className="text-gray-600 max-w-md mx-auto mb-8 text-lg">
                    Thank you for contacting us. Our dispatch team will review your request and get back to you shortly.
                </p>
                <button
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Submit Another Enquiry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto w-full">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4 min-h-[48px]">
                        {branding?.logo_url ? (
                            <img src={branding.logo_url} alt="Company Logo" className="h-16 object-contain" />
                        ) : (
                            <Truck className="h-12 w-12 text-blue-600" />
                        )}
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        {branding?.company_name || "ScheduleLab"} Enquiry Form
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                        Request a machine or schedule a job with our expert team.
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10" style={{ borderTopColor: branding?.primary_color || '#2563eb', borderTopWidth: '4px' }}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Full Name / Customer Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        required
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        placeholder="Enter your name or company"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Email Address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        required
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Phone Number
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="tel"
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                        placeholder="0400 000 000"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Job Site Location
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Street address or site name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Preferred Date
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="date"
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.preferred_date}
                                        onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Anticipated Hours
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.anticipated_hours}
                                        onChange={(e) => setFormData({ ...formData, anticipated_hours: e.target.value })}
                                        placeholder="e.g. 4.5"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Asset Requirement
                                </label>
                                <p className="text-xs text-gray-500 mb-1">What kind of machinery do you think you need?</p>
                                <div>
                                    <select
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all bg-white"
                                        value={formData.asset_type_id}
                                        onChange={(e) => setFormData({ ...formData, asset_type_id: e.target.value })}
                                    >
                                        <option value="">Not Sure / Let Dispatch Decide</option>
                                        {assetTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    PO Number (Optional)
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.po_number}
                                        onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                                        placeholder="e.g. PO-12345"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Requirement Details
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        required
                                        rows={4}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-900 transition-all"
                                        value={formData.job_details}
                                        onChange={(e) => setFormData({ ...formData, job_details: e.target.value })}
                                        placeholder="What machinery do you need? What is the scope of work?"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2 pt-2 pb-2">
                                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <div>
                                        <label className="text-sm font-bold text-gray-900 block">Site Inspection Required?</label>
                                        <p className="text-xs text-gray-600">Would you like our supervisors to visit the site first to assess the job?</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, site_inspection_required: true })}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${formData.site_inspection_required ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'}`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, site_inspection_required: false })}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${!formData.site_inspection_required ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'}`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: branding?.primary_color || '#2563eb' }}
                                className="w-full inline-flex justify-center py-4 px-6 border border-transparent shadow-lg text-lg font-bold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform hover:scale-[1.01] hover:brightness-110"
                            >
                                {isSubmitting ? "Submitting..." : "Send Enquiry"}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} {branding?.company_name || "ScheduleLab"}. All rights reserved.
                </p>
            </div>
        </div>
    );
}
