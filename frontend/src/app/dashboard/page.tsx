"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/utils/auth";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    const role = getUserRole();
    if (!role) {
      router.replace("/auth/login");
    } else if (role === "employee") {
      router.replace("/employee/dashboard");
    } else if (role === "manager") {
      router.replace("/manager/dashboard");
    } else if (role === "hr") {
      router.replace("/hr/dashboard");
    } else if (role === "superadmin") {
      router.replace("/admin/parameters");
    } else {
      router.replace("/auth/login");
    }
  }, [router]);
  return null;
}
