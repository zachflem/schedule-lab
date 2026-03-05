import { createClient } from '@/lib/supabase/server'

export type UserRole = 'Administrator' | 'Superuser' | 'Dispatcher' | 'Operator';

export async function getUserRole(): Promise<UserRole | null> {
    console.log("[DEBUG] getUserRole hook started");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log("[DEBUG] getUserRole fetched user:", user?.email);

    if (!user) return null;

    console.log("[DEBUG] getUserRole fetching role for:", user.id);
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        console.error("Error fetching user role:", error?.message);
        return null;
    }

    return data.role as UserRole;
}
