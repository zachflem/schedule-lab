import { MainLayout } from "@/components/layout/MainLayout";
import { getUserRole } from "@/lib/hooks/useUserRole";

export default async function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userRole = await getUserRole();
    return <MainLayout userRole={userRole}>{children}</MainLayout>;
}
