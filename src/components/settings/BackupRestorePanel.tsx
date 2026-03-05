"use client";

import { useState } from "react";
import { DownloadCloud, UploadCloud, AlertTriangle, Loader2 } from "lucide-react";

export function BackupRestorePanel() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [verificationString, setVerificationString] = useState("");
    const [randomChallenge, setRandomChallenge] = useState("");

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch("/api/backup");
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Backup failed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Extract filename from Content-Disposition if available
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = `ScheduleLab_Backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch.length === 2) {
                    filename = filenameMatch[1];
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            alert("Error downloading backup: " + error.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    const initiateRestore = () => {
        if (!restoreFile) {
            alert("Please select a .sql file to restore");
            return;
        }

        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 32; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        setRandomChallenge(result);
        setVerificationString("");
        setShowRestoreConfirm(true);
    };

    const confirmRestore = async () => {
        if (verificationString !== randomChallenge) return;
        if (!restoreFile) return;

        setShowRestoreConfirm(false);
        setIsRestoring(true);

        const formData = new FormData();
        formData.append("file", restoreFile);

        try {
            const response = await fetch("/api/restore", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Restore failed");
            }

            alert("Database restored successfully! The page will now reload.");
            window.location.reload();
        } catch (error: any) {
            alert("Error restoring backup: " + error.message);
        } finally {
            setIsRestoring(false);
            setRestoreFile(null);
            setVerificationString("");
        }
    };

    return (
        <section className="space-y-6 pt-6 mb-12 border-t border-gray-100">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Backup & Restore</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* BACKUP */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <DownloadCloud className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Download Backup</h3>
                        <p className="text-sm text-gray-500 mt-1 px-4">
                            Generate a full SQL dump of the current database representing all tenants, jobs, customers, and settings.
                        </p>
                    </div>
                    <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                        {isBackingUp ? (
                            <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Generating...</>
                        ) : (
                            <><DownloadCloud className="-ml-1 mr-2 h-5 w-5" /> Backup Now</>
                        )}
                    </button>
                </div>

                {/* RESTORE */}
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
                        <UploadCloud className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Restore from Backup</h3>
                        <p className="text-sm text-gray-500 mt-1 px-4">
                            Upload a previously generated SQL dump. <strong className="text-red-600">This will overwrite all current data!</strong>
                        </p>
                    </div>

                    <div className="w-full flex flex-col items-center space-y-3">
                        <input
                            type="file"
                            accept=".sql"
                            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-red-50 file:text-red-700
                                hover:file:bg-red-100"
                        />
                        <button
                            onClick={initiateRestore}
                            disabled={!restoreFile || isRestoring}
                            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
                        >
                            {isRestoring ? (
                                <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Restoring...</>
                            ) : (
                                <><AlertTriangle className="-ml-1 mr-2 h-5 w-5" /> Overwrite & Restore</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Restore Security Modal */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 bg-gray-900/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10 mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Critical Warning</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            You are about to restore the database from a backup file. All current data will be permanently destroyed and replaced with the backup content. This cannot be undone.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm font-mono text-center text-gray-800 font-bold border border-gray-200 select-none break-all">
                            {randomChallenge}
                        </div>

                        <p className="text-sm text-gray-600 mb-2 font-medium">Type the characters above to confirm:</p>
                        <input
                            type="text"
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 font-mono text-center uppercase tracking-widest mb-6"
                            placeholder="...."
                            value={verificationString}
                            onChange={(e) => setVerificationString(e.target.value.toUpperCase())}
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRestoreConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRestore}
                                disabled={verificationString !== randomChallenge}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 transition-colors"
                            >
                                Confirm Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
