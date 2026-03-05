"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/context/UserRoleContext";

interface PublicLink {
    title: string;
    description: string;
    path: string;
}

const PUBLIC_LINKS: PublicLink[] = [
    {
        title: "Public Enquiry Form",
        description: "Share this link with potential customers so they can submit job requests directly into your dashboard.",
        path: "/enquiry"
    },
    {
        title: "Standard Hire Terms & Conditions",
        description: "The public-facing page detailing your standard hire terms. Useful to include in email signatures or quote PDFs.",
        path: "/terms"
    }
];

export default function ExternalLinksPage() {
    const [origin, setOrigin] = useState("");
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const userRole = useUserRole();

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const handleCopy = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="h-6 w-6 text-blue-500" />
                        External Links
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Manage and distribute public-facing URLs to your customers.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                    {userRole === 'Administrator' && (
                        <div className="p-6 bg-slate-50 border-b-2 border-slate-200 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Database className="h-5 w-5 text-indigo-500" />
                                        Supabase Studio (Admin Only)
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Direct access into the database management console. Only users with the Administrator role can see this secure link.
                                    </p>
                                </div>

                                <div className="w-full md:w-[450px] shrink-0 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-100 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono truncate select-all">
                                            http://localhost:8000
                                        </div>
                                        <button
                                            onClick={() => handleCopy("http://localhost:8000", 999)}
                                            className={cn(
                                                "shrink-0 p-2 rounded-md border shadow-sm transition-colors",
                                                copiedIndex === 999
                                                    ? "bg-green-50 border-green-200 text-green-600"
                                                    : "bg-white border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300"
                                            )}
                                            title="Copy to clipboard"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <a
                                            href="http://localhost:8000"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 p-2 bg-white rounded-md border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-colors"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                    {copiedIndex === 999 && (
                                        <p className="text-xs text-green-600 font-medium text-right">Copied to clipboard!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {PUBLIC_LINKS.map((linkItem, idx) => {
                        const fullUrl = origin ? `${origin}${linkItem.path}` : linkItem.path;

                        return (
                            <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex-1 space-y-1">
                                        <h3 className="text-lg font-bold text-gray-900">{linkItem.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {linkItem.description}
                                        </p>
                                    </div>

                                    <div className="w-full md:w-[450px] shrink-0 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 font-mono truncate select-all">
                                                {fullUrl}
                                            </div>
                                            <button
                                                onClick={() => handleCopy(fullUrl, idx)}
                                                className={cn(
                                                    "shrink-0 p-2 rounded-md border shadow-sm transition-colors",
                                                    copiedIndex === idx
                                                        ? "bg-green-50 border-green-200 text-green-600"
                                                        : "bg-white border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200"
                                                )}
                                                title="Copy to clipboard"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                            <a
                                                href={linkItem.path}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="shrink-0 p-2 bg-white rounded-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-colors"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                        {copiedIndex === idx && (
                                            <p className="text-xs text-green-600 font-medium text-right">Copied to clipboard!</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                <div className="shrink-0 mt-0.5">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">Keeping this list updated</h4>
                    <p className="text-xs text-blue-700 mt-1">
                        As new public-facing pages (like customer portals or public asset registries) are added to the platform, their URLs will automatically be indexed here for easy access.
                    </p>
                </div>
            </div>
        </div>
    );
}
