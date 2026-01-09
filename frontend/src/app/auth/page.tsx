"use client";
import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">HRMS Appraisal System</h1>
      <div className="flex gap-8">
        <Link href="/register" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">Register</Link>
        <Link href="/login" className="px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-800">Login</Link>
      </div>
    </div>
  );
}
