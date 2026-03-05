"use server";

import { createClient } from "@supabase/supabase-js";

// We must use the absolute standard Supabase client with the Service Role key
// to elevate privileges and bypass Row Level Security for auth admin actions.
const supabaseAdminUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(
    supabaseAdminUrl,
    process.env.SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function inviteUser(email: string, personnelId: string) {
    if (!email || !personnelId) {
        return { error: "Missing required fields" };
    }

    try {
        // 1. Send the invite via Supabase Auth Admin
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`
        });

        if (inviteError) {
            console.error("[UserManagement] Failed to invite user:", inviteError);
            return { error: inviteError.message };
        }

        const newUserId = inviteData.user.id;

        // 2. Link the generated auth.users ID to the personnel table record
        const { error: updateError } = await supabaseAdmin
            .from("personnel")
            .update({ auth_id: newUserId, can_login: true })
            .eq("id", personnelId);

        if (updateError) {
            console.error("[UserManagement] Failed to link auth_id to personnel:", updateError);
            return { error: "User invited via email, but failed to link profile. Please contact support." };
        }

        return { success: true };
    } catch (err: any) {
        return { error: err?.message || "Internal server error" };
    }
}

export async function resetUserPassword(email: string) {
    if (!email) {
        return { error: "Email is required" };
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`
            }
        });

        if (error) {
            console.error("[UserManagement] Failed to generate password reset:", error);
            return { error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { error: err?.message || "Internal server error" };
    }
}
