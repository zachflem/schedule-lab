"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        try {
            const { error } = await createClient().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                setStatus("error");
                setErrorMessage(error.message);
            } else {
                setStatus("success");
            }
        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err?.message || "An unexpected error occurred.");
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <Mail className="h-8 w-8" />
                    </div>
                </div>
                <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                {status === "success" ? (
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200 text-center space-y-4">
                        <h3 className="text-green-800 font-medium">Check your inbox</h3>
                        <p className="text-sm text-green-700">
                            We've sent a password reset link to <strong>{email}</strong>.
                        </p>
                        <p className="text-xs text-green-600">
                            If you don't see it within a few minutes, check your spam folder.
                        </p>
                        <div className="pt-4">
                            <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-500 flex items-center justify-center gap-2">
                                <ArrowLeft className="h-4 w-4" /> Return to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">
                                Email address
                            </label>
                            <div className="mt-2">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
                                disabled={status === "loading" || !email}
                                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                            >
                                {status === "loading" ? "Sending link..." : "Send reset link"}
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back to sign in
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
