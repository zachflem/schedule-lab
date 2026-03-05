"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Lock, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Validate session on load
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await createClient().auth.getSession();
            if (!session) {
                // Not authenticated yet by the callback link
                router.push("/login?error=Invalid+or+expired+recovery+link");
            } else {
                setIsCheckingAuth(false);
            }
        }
        checkSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus("error");
            setErrorMessage("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setStatus("error");
            setErrorMessage("Password must be at least 6 characters.");
            return;
        }

        setStatus("loading");
        setErrorMessage("");

        try {
            const { error } = await createClient().auth.updateUser({
                password: password
            });

            if (error) {
                setStatus("error");
                setErrorMessage(error.message);
            } else {
                setStatus("success");
                // Pre-fetch the jobs page in the background
                router.prefetch("/jobs");
            }
        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err?.message || "An unexpected error occurred.");
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-500 animate-pulse">Verifying secure link...</p>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                    </div>
                    <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                        Password updated!
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Your account is secure and you are now logged in.
                    </p>
                    <div className="mt-8">
                        <button
                            onClick={() => {
                                router.push("/jobs");
                                router.refresh();
                            }}
                            className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 transition-colors"
                        >
                            Continue to Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <KeyRound className="h-8 w-8" />
                    </div>
                </div>
                <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                    Set new password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please create a strong password for your account.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">
                            New Password
                        </label>
                        <div className="mt-2 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                placeholder="Min 6 characters"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">
                            Confirm Password
                        </label>
                        <div className="mt-2 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                placeholder="Re-type new password"
                            />
                        </div>
                    </div>

                    {status === "error" && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                            {errorMessage}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={status === "loading" || !password || !confirmPassword}
                            className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                        >
                            {status === "loading" ? "Saving..." : "Save password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
