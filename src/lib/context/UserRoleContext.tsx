"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/lib/hooks/useUserRole";

export const UserRoleContext = createContext<UserRole | null>(null);

export function useUserRole() {
    return useContext(UserRoleContext);
}
