import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createClient } from "@/lib/supabase/server";

const execAsync = promisify(exec);

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify role
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (roleData?.role !== "Administrator" && roleData?.role !== "Superuser") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Configuration
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return new NextResponse("DATABASE_URL is not configured on the server", { status: 500 });
        }

        /**
         * To support both local dev without `pg_dump` installed and production docker:
         * We try to run pg_dump directly (if installed on host or in the NextJS container).
         * If it fails (e.g. locally), we attempt to use docker exec against the supabase-db container if running locally.
         */

        let dumpOutput = "";

        try {
            // Attempt 1: Native pg_dump (Production or local if installed)
            const cmd = `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges -n public`;
            const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 }); // 50MB buffer
            dumpOutput = stdout;
        } catch (e: any) {
            console.warn("pg_dump failed natively, attempting docker fallback...", e.message);
            try {
                // Attempt 2: Docker fallback (Local development standard Supabase stack)
                const cmd = `docker exec supabase-db pg_dump -U postgres -d postgres --clean --if-exists --no-owner --no-privileges -n public`;
                const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });
                dumpOutput = stdout;
            } catch (dockerError: any) {
                console.error("Docker fallback failed:", dockerError.message);
                return new NextResponse("Failed to generate backup. Please ensure postgresql-client is installed on the server hosting the application.", { status: 500 });
            }
        }

        const date = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `ScheduleLab_Backup_${date}.sql`;

        return new NextResponse(dumpOutput, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": "application/sql",
            },
        });
    } catch (error: any) {
        console.error("Backup error:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
