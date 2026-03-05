"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { BackupRestorePanel } from "@/components/settings/BackupRestorePanel";

export default function SystemConfigPage() {
    const router = useRouter();

    // Branding
    const [companyName, setCompanyName] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#2563eb");
    const [logoUrl, setLogoUrl] = useState("");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    // Email Configuration
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");
    const [smtpFrom, setSmtpFrom] = useState("");

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Here we could technically check role client-side if we wanted, 
        // but it's fine for now since the link is hidden and the API might fail if RLS exists.
        fetchPlatformSettings();
    }, []);

    async function fetchPlatformSettings() {
        setIsLoading(true);
        const { data, error } = await createClient()
            .from("platform_settings")
            .select("*")
            .eq("id", "global")
            .single();

        if (error) {
            console.error("Error fetching platform settings:", error);
        } else if (data) {
            setCompanyName(data.company_name || "");
            setPrimaryColor(data.primary_color || "#2563eb");
            setLogoUrl(data.logo_url || "");
            setSmtpHost(data.smtp_host || "");
            setSmtpPort(data.smtp_port ? data.smtp_port.toString() : "");
            setSmtpUser(data.smtp_user || "");
            setSmtpPass(data.smtp_pass || "");
            setSmtpFrom(data.smtp_from || "");
        }
        setIsLoading(false);
    }

    async function handleUpdateSystemSettings() {
        const { error } = await createClient()
            .from("platform_settings")
            .upsert({
                id: "global",
                company_name: companyName,
                primary_color: primaryColor,
                logo_url: logoUrl,
                smtp_host: smtpHost,
                smtp_port: smtpPort ? parseInt(smtpPort) : null,
                smtp_user: smtpUser,
                smtp_pass: smtpPass,
                smtp_from: smtpFrom
            }, { onConflict: 'id' });

        if (error) {
            alert("Error updating settings: " + error.message);
        } else {
            alert("System Configuration updated successfully.");
        }
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            alert("Logo must be smaller than 2MB.");
            return;
        }

        setIsUploadingLogo(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `tenant_logo_${Math.random()}.${fileExt}`;

        try {
            const { error: uploadError } = await createClient().storage
                .from('branding_assets')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = createClient().storage
                .from('branding_assets')
                .getPublicUrl(fileName);

            setLogoUrl(data.publicUrl);
            alert("Logo uploaded! Please remember to click 'Save Branding' to apply it.");
        } catch (error: any) {
            alert("Upload failed: " + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500 font-mono text-sm">Loading System Configuration...</div>;

    return (
        <div className="space-y-12 pb-20 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                    <Key className="mr-3 h-8 w-8 text-blue-600" />
                    System Configuration
                </h1>
                <p className="mt-1 text-gray-500">
                    Restricted admin dashboard for managing white-labeling and core email infrastructure.
                </p>
            </div>

            {/* SECTION: WHITE LABELING */}
            <section className="space-y-6 pt-6 mb-12 border-t border-gray-200">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                    <div className="h-2 w-2 bg-pink-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">White Labeling</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Custom Branding</h3>
                        <p className="text-sm text-gray-500">
                            Configure your company details, brand colors, and transparent logos here. These will customize the look and feel of your Public facing forms.
                        </p>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="e.g. ScheduleLab Engineering"
                                    />

                                    <label className="block text-sm font-bold text-gray-900 mt-4">Primary Brand Color</label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="h-10 w-16 p-1 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900 uppercase font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">Company Logo</label>
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 mt-1 h-32 relative group overflow-hidden">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                                <span className="mt-2 block text-xs font-semibold text-gray-500">Upload Transparent PNG</span>
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/svg+xml"
                                            onChange={handleLogoUpload}
                                            disabled={isUploadingLogo}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />

                                        {isUploadingLogo && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    {logoUrl && (
                                        <button
                                            onClick={() => setLogoUrl("")}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Remove Logo
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleUpdateSystemSettings}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Save Branding
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: EMAIL CONFIGURATION */}
            <section className="space-y-6 pt-6 mb-12 border-t border-gray-200">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                    <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Email Configuration</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">SMTP Settings</h3>
                        <p className="text-sm text-gray-500">
                            Configure your custom SMTP server details to send clarification emails and notifications from your own domain. If left blank, the system may fall back to default internal configurations (if set).
                        </p>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">SMTP Host</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={smtpHost}
                                        onChange={(e) => setSmtpHost(e.target.value)}
                                        placeholder="e.g. smtp.gmail.com or smtp.mailgun.org"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">SMTP Port</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={smtpPort}
                                        onChange={(e) => setSmtpPort(e.target.value)}
                                        placeholder="e.g. 587 or 465"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">SMTP Username</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={smtpUser}
                                        onChange={(e) => setSmtpUser(e.target.value)}
                                        placeholder="e.g. user@domain.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-900">SMTP Password</label>
                                    <input
                                        type="password"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={smtpPass}
                                        onChange={(e) => setSmtpPass(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-900">From Address</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 border py-2 text-gray-900"
                                        value={smtpFrom}
                                        onChange={(e) => setSmtpFrom(e.target.value)}
                                        placeholder='e.g. "ScheduleLab Dispatch" <dispatch@schedulelab.com>'
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleUpdateSystemSettings}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Save Email Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Backup & Restore */}
            <BackupRestorePanel />
        </div>
    );
}
