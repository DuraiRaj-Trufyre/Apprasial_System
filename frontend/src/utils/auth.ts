import { jwtDecode } from "jwt-decode";

export interface DecodedToken {
  sub: string;
  role: string;
  manager_id?: string;
  [key: string]: any;
}

export interface Appraisal {
  id?: string;
  appraisalId?: string;
  employeeName?: string;
  employee_id?: string;
  manager_rating?: number;
  status?: string;
  [key: string]: any;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  window.location.href = "/";
  }
}
