import { NextResponse, NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createClient } from "@/lib/supabase/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    let tmpPath = "";
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (roleData?.role !== "Administrator") {
            return new NextResponse("Forbidden - Only Administrators can restore backups.", { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new NextResponse("No file provided", { status: 400 });
        }

        if (!file.name.endsWith(".sql")) {
            return new NextResponse("Invalid file type. Only .sql files are allowed.", { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        tmpPath = path.join(os.tmpdir(), `restore_${Date.now()}.sql`);
        await writeFile(tmpPath, buffer);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return new NextResponse("DATABASE_URL is not configured", { status: 500 });
        }

        // Drop schema public cascade and recreate it to ensure a clean slate before restoring
        const cleanCmd = `psql "${dbUrl}" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;'`;

        try {
            await execAsync(cleanCmd);
        } catch (e) {
            console.warn("Native psql cleanup failed, trying docker...", e);
            const dockerClean = `docker exec supabase-db psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"`;
            await execAsync(dockerClean);
        }

        // Restore
        try {
            const restoreCmd = `psql "${dbUrl}" -f "${tmpPath}"`;
            await execAsync(restoreCmd);
        } catch (e: any) {
            console.warn("Native psql restore failed, trying docker fallback...", e.message);

            // For docker, we stream the file into it
            const dockerRestore = `cat "${tmpPath}" | docker exec -i supabase-db psql -U postgres -d postgres`;
            await execAsync(dockerRestore);
        }

        return NextResponse.json({ success: true, message: "Database restored successfully." });
    } catch (error: any) {
        console.error("Restore error:", error);
        return new NextResponse(error.message || "Failed to restore database", { status: 500 });
    } finally {
        if (tmpPath) {
            try {
                await unlink(tmpPath);
            } catch (e) {
                console.error("Failed to cleanup tmp restore file", e);
            }
        }
    }
}
