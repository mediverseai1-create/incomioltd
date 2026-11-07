export type Role = 'owner' | 'administrator' | 'cfo' | 'finance_manager' | 'accountant' | 'ar_officer' | 'department_manager' | 'executive_viewer';
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner', administrator: 'Administrator', cfo: 'CFO / Finance Director', finance_manager: 'Finance Manager',
  accountant: 'Accountant', ar_officer: 'Accounts Receivable Officer', department_manager: 'Department Manager', executive_viewer: 'Executive Viewer',
};
export type Perm = 'write_finance' | 'approve' | 'admin' | 'run_ai' | 'billing';
const MAP: Record<Perm, Role[]> = {
  write_finance: ['owner', 'administrator', 'cfo', 'finance_manager', 'accountant', 'ar_officer'],
  approve: ['owner', 'administrator', 'cfo', 'finance_manager'],
  admin: ['owner', 'administrator'],
  run_ai: ['owner', 'administrator', 'cfo', 'finance_manager', 'accountant', 'ar_officer'],
  billing: ['owner', 'administrator'],
};
// Mirrors the SQL helper functions (can_write_finance / can_approve / can_admin). RLS is the real enforcement.
export const can = (role: Role | null | undefined, perm: Perm) => !!role && MAP[perm].includes(role);
