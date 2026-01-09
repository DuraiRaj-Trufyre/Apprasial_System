"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Parameters", href: "/admin/parameters" },
  { label: "User Management", href: "/admin/users" },
];

export default function AdminHomeLayout({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex gap-4 px-8 py-4 bg-white border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              pathname.startsWith(tab.href)
                ? "bg-blue-600 text-white shadow"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
