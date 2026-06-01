export type RequestType = "installation" | "breakdown";

export type JobStatus =
  | "new"
  | "docs_pending"
  | "ready_to_assign"
  | "assigned_pending"
  | "accepted"
  | "reached"
  | "working"
  | "completed"
  | "cancelled";

export type TechStatus = "available" | "busy" | "off";

export interface Technician {
  id: string;
  name: string;
  phone: string;
  status: TechStatus;
}

export interface LeadInfo {
  customer_name: string;
  phone: string;
  area: string | null;
  address: string | null;
  request_type: RequestType;
  product_details: string | null;
  customer_token: string | null;
}

export interface JobRow {
  id: string;
  status: JobStatus;
  created_at: string;
  assigned_at: string | null;
  accept_deadline: string | null;
  serial_number: string | null;
  lead: LeadInfo | null;
  technician: { name: string } | null;
}

export const TECH_STATUS_LABELS: Record<TechStatus, string> = {
  available: "Available",
  busy: "Busy",
  off: "On Leave",
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  new: "New",
  docs_pending: "Docs Pending",
  ready_to_assign: "Ready to Assign",
  assigned_pending: "Awaiting Accept",
  accepted: "Accepted",
  reached: "Reached Site",
  working: "Working",
  completed: "Completed",
  cancelled: "Cancelled",
};
