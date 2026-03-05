"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TenantSettings {
    standard_hire_terms: string;
    company_name: string;
    logo_url: string;
    primary_color: string;
}

export default function PublicTermsPage() {
    const [settings, setSettings] = useState<TenantSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            const { data, error } = await createClient()
                .from("platform_settings")
                .select("standard_hire_terms, company_name, logo_url, primary_color")
                .eq("id", "global")
                .single();

            if (!error && data) {
                setSettings(data as TenantSettings);
            }
            setIsLoading(false);
        }
        fetchSettings();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-8 py-6" style={{ backgroundColor: settings?.primary_color || '#2563eb' }}>
                    <div className="flex items-center space-x-4">
                        {settings?.logo_url && (
                            <img src={settings.logo_url} alt="Logo" className="h-12 w-auto object-contain bg-white/10 rounded-lg p-1" />
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Standard Hire Terms & Conditions</h1>
                            <p className="text-white/80 text-sm mt-1">{settings?.company_name || "ScheduleLab"} Platform - Public Disclosure</p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" style={{ borderColor: settings?.primary_color || '#2563eb', borderBottomColor: 'transparent' }}></div>
                        </div>
                    ) : settings?.standard_hire_terms ? (
                        <div className="prose prose-blue max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                                {settings.standard_hire_terms}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 italic">
                            No terms have been published yet.
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                    <span>© {new Date().getFullYear()} {settings?.company_name || "ScheduleLab"}</span>
                    <span>Document ID: SL-TNC-GLOBAL</span>
                </div>
            </div>

            <div className="text-center mt-8">
                <a href="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                    ← Back to Platform
                </a>
            </div>
        </div>
    );
}
