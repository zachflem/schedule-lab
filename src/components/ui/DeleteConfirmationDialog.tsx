"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog/index";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    entityName?: string;
    isDeleting?: boolean;
}

function generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Deletion",
    entityName = "this item",
    isDeleting = false
}: DeleteConfirmationDialogProps) {
    const [challengeString, setChallengeString] = useState("");
    const [inputString, setInputString] = useState("");

    useEffect(() => {
        if (isOpen) {
            setChallengeString(generateRandomString(12));
            setInputString("");
        }
    }, [isOpen]);

    const isMatch = challengeString === inputString;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                        This action will permanently remove <span className="font-semibold text-gray-900">{entityName}</span>.
                        Enter the following string exactly to confirm this action:
                    </p>
                    <div className="bg-gray-100 p-3 rounded-md border border-gray-200 text-center font-mono text-lg tracking-wider text-gray-900 select-none user-select-none">
                        {challengeString}
                    </div>
                    <div>
                        <input
                            type="text"
                            value={inputString}
                            onChange={(e) => setInputString(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                            placeholder="Type the string here..."
                            autoComplete="off"
                            spellCheck="false"
                            onPaste={(e) => {
                                e.preventDefault();
                                alert("Pasting is disabled for security confirmation.");
                            }}
                        />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!isMatch || isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isDeleting ? "Deleting..." : "Permanently Delete"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
