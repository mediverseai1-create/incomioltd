-- Incomio schema. Money columns are numeric(18,2); never float.
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, created_at timestamptz default now()
);
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, business_type text, primary_currency char(3) not null default 'USD',
  structure text not null default 'single', created_by uuid references auth.users(id),
  onboarding_complete boolean not null default false, created_at timestamptz default now()
);
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null check (role in ('owner','administrator','cfo','finance_manager','accountant','ar_officer','department_manager','executive_viewer')),
  status text not null default 'active' check (status in ('active','invited')),
  created_at timestamptz default now(),
  unique (organization_id, user_id)
);
create table organization_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  due_soon_days int not null default 7, fx_rates jsonb not null default '{}'::jsonb,
  role_overrides jsonb not null default '{}'::jsonb, updated_at timestamptz default now()
);

-- helper functions (security definer so RLS policies don't recurse)
create or replace function is_member(org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = org and user_id = auth.uid() and status = 'active') $$;
create or replace function member_role(org uuid) returns text language sql security definer stable set search_path = public as $$
  select role from organization_members where organization_id = org and user_id = auth.uid() and status = 'active' limit 1 $$;
create or replace function can_write_finance(org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(member_role(org) in ('owner','administrator','cfo','finance_manager','accountant','ar_officer'), false) $$;
create or replace function can_approve(org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(member_role(org) in ('owner','administrator','cfo','finance_manager'), false) $$;
create or replace function can_admin(org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(member_role(org) in ('owner','administrator'), false) $$;

create table business_units (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name text not null, kind text not null default 'business' check (kind in ('business','subsidiary','branch','department','location')),
  parent_id uuid references business_units(id) on delete set null, created_at timestamptz default now()
);
create table customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name text not null, email text, phone text, external_ref text, business_unit_id uuid references business_units(id) on delete set null,
  notes text, created_at timestamptz default now(), unique (organization_id, name)
);
create table imported_files (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  storage_path text not null, filename text not null, mime_type text, size_bytes bigint, uploaded_by uuid references auth.users(id), created_at timestamptz default now()
);
create table data_imports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  category text not null, file_id uuid references imported_files(id) on delete set null, mapping jsonb,
  total_rows int default 0, imported_rows int default 0, rejected_rows int default 0, skipped_rows int default 0, flagged_rows int default 0,
  issues jsonb default '[]'::jsonb, status text not null default 'completed', created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table invoices (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null, business_unit_id uuid references business_units(id) on delete set null,
  reference text not null, issue_date date, due_date date, currency char(3) not null,
  amount numeric(18,2) not null check (amount >= 0), direct_cost numeric(18,2), discount numeric(18,2) default 0,
  service text, status text not null default 'open' check (status in ('open','void')),
  source_file_id uuid references imported_files(id) on delete set null, import_id uuid references data_imports(id) on delete set null,
  needs_review boolean not null default false, created_at timestamptz default now(),
  unique (organization_id, reference, currency)
);
create table invoice_line_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade, description text, quantity numeric(18,4) default 1, unit_price numeric(18,2), amount numeric(18,2)
);
create table payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null, business_unit_id uuid references business_units(id) on delete set null,
  reference text, payment_date date not null, amount numeric(18,2) not null check (amount > 0), currency char(3) not null,
  method text, source_file_id uuid references imported_files(id) on delete set null, import_id uuid references data_imports(id) on delete set null,
  created_at timestamptz default now()
);
create table bank_transactions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  txn_date date not null, description text, reference text, amount numeric(18,2) not null, currency char(3) not null,
  counterparty text, import_id uuid references data_imports(id) on delete set null, created_at timestamptz default now()
);
-- Confirmed allocations of a payment to an invoice. Only written after human approval.
create table payment_allocations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade, invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0), created_by uuid references auth.users(id), created_at timestamptz default now(),
  unique (payment_id, invoice_id)
);
create table reconciliation_matches (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade, invoice_id uuid references invoices(id) on delete cascade,
  bank_transaction_id uuid references bank_transactions(id) on delete cascade,
  kind text not null default 'suggested' check (kind in ('suggested','partial','overpayment','underpayment','duplicate')),
  proposed_amount numeric(18,2), confidence numeric(4,3) not null default 0, evidence jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','investigate')),
  created_at timestamptz default now()
);
create table reconciliation_reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  match_id uuid not null references reconciliation_matches(id) on delete cascade, reviewer_id uuid references auth.users(id),
  decision text not null, note text, created_at timestamptz default now()
);
create table expenses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  business_unit_id uuid references business_units(id) on delete set null, expense_date date not null, category text, vendor text,
  amount numeric(18,2) not null, currency char(3) not null, recurring boolean default false, import_id uuid references data_imports(id) on delete set null,
  created_at timestamptz default now()
);
create table supplier_obligations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  supplier text not null, due_date date not null, amount numeric(18,2) not null, currency char(3) not null,
  status text not null default 'open' check (status in ('open','paid')), import_id uuid references data_imports(id) on delete set null,
  created_at timestamptz default now()
);
create table collection_activities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade, invoice_id uuid references invoices(id) on delete set null,
  channel text not null default 'note', summary text not null, outcome text, follow_up_date date,
  status text not null default 'open' check (status in ('open','done')), created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table collection_drafts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade, subject text, body text not null,
  status text not null default 'draft' check (status in ('draft','approved','rejected','sent_manually')),
  generated_by_ai boolean default true, approved_by uuid references auth.users(id), created_at timestamptz default now()
);
create table cash_flow_forecasts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  currency char(3) not null, horizon_days int not null, assumptions jsonb not null, result jsonb not null, narrative text,
  created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table forecast_scenarios (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  forecast_id uuid not null references cash_flow_forecasts(id) on delete cascade, name text not null, assumptions jsonb not null, result jsonb not null
);
create table financial_insights (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  title text not null, category text not null, severity text not null default 'medium' check (severity in ('low','medium','high')),
  explanation text not null, supporting_records jsonb default '[]'::jsonb, financial_impact numeric(18,2), currency char(3),
  confidence numeric(4,3), recommended_action text, review_status text not null default 'new' check (review_status in ('new','reviewed','dismissed')),
  agent_key text, created_at timestamptz default now()
);
create table ai_agents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  key text not null, name text not null, purpose text not null, capabilities text[] not null default '{}', data_scope text[] not null default '{}',
  enabled boolean not null default true, unique (organization_id, key)
);
create table ai_agent_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  agent_key text not null, status text not null default 'running' check (status in ('running','completed','failed')),
  summary text, findings jsonb, error text, tokens_in int, tokens_out int, started_by uuid references auth.users(id),
  created_at timestamptz default now(), finished_at timestamptz
);
create table recommended_actions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  title text not null, description text, customer_id uuid references customers(id) on delete set null, invoice_id uuid references invoices(id) on delete set null,
  expected_outcome text, priority text not null default 'medium' check (priority in ('low','medium','high')), evidence jsonb default '[]'::jsonb,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  assignee_id uuid references auth.users(id), completion_status text not null default 'open' check (completion_status in ('open','in_progress','done')),
  agent_key text, created_at timestamptz default now()
);
create table action_approvals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  action_id uuid not null references recommended_actions(id) on delete cascade, approver_id uuid references auth.users(id),
  decision text not null, note text, created_at timestamptz default now()
);
create table reports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null, title text not null, parameters jsonb, content jsonb not null, narrative text, created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table integrations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null, status text not null default 'not_connected' check (status in ('not_connected','connected','error')),
  config jsonb, last_sync_at timestamptz, unique (organization_id, provider)
);
create table subscriptions (
  organization_id uuid primary key references organizations(id) on delete cascade,
  plan text not null default 'none' check (plan in ('none','starter','professional','enterprise')),
  status text not null default 'inactive' check (status in ('inactive','active','past_due','canceled')),
  current_period_end timestamptz, external_ref text, updated_at timestamptz default now()
);
create table billing_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  event text not null, plan text, amount numeric(18,2), currency char(3), external_ref text, created_at timestamptz default now()
);
create table usage_records (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null, units int not null default 1, user_id uuid references auth.users(id), meta jsonb, created_at timestamptz default now()
);
create index usage_org_kind_time on usage_records (organization_id, kind, created_at);
create table audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id), action text not null, entity text, entity_id text, detail jsonb, created_at timestamptz default now()
);
create table chat_messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id), role text not null check (role in ('user','assistant')), content text not null, citations jsonb, created_at timestamptz default now()
);

create index on invoices (organization_id, due_date);
create index on payments (organization_id, payment_date);
create index on reconciliation_matches (organization_id, status);

-- ============ RLS ============
alter table profiles enable row level security;
create policy profiles_sel on profiles for select using (id = auth.uid() or exists (select 1 from organization_members a join organization_members b on a.organization_id=b.organization_id where a.user_id=auth.uid() and b.user_id=profiles.id));
create policy profiles_upd on profiles for update using (id = auth.uid());
create policy profiles_ins on profiles for insert with check (id = auth.uid());

alter table organizations enable row level security;
create policy org_select on organizations for select using (is_member(id));
create policy org_update on organizations for update using (can_admin(id));

alter table organization_members enable row level security;
create policy mem_select on organization_members for select using (is_member(organization_id));
create policy mem_insert on organization_members for insert with check (can_admin(organization_id));
create policy mem_update on organization_members for update using (can_admin(organization_id));
create policy mem_delete on organization_members for delete using (can_admin(organization_id));

alter table organization_settings enable row level security;
create policy os_select on organization_settings for select using (is_member(organization_id));
create policy os_write on organization_settings for update using (can_admin(organization_id));

do $$ declare t text; begin
  -- Finance tables: members read, finance roles write, approvers delete.
  foreach t in array array['business_units','customers','invoices','invoice_line_items','payments','bank_transactions','payment_allocations','expenses','supplier_obligations','collection_activities','collection_drafts','imported_files','data_imports']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(organization_id))', t||'_sel', t);
    execute format('create policy %I on %I for insert with check (can_write_finance(organization_id))', t||'_ins', t);
    execute format('create policy %I on %I for update using (can_write_finance(organization_id))', t||'_upd', t);
    execute format('create policy %I on %I for delete using (can_approve(organization_id))', t||'_del', t);
  end loop;
  -- Approval-gated tables: members read; finance roles insert; approvers update.
  foreach t in array array['reconciliation_matches','reconciliation_reviews','recommended_actions','action_approvals','financial_insights','cash_flow_forecasts','forecast_scenarios','reports','ai_agent_runs','chat_messages']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(organization_id))', t||'_sel', t);
    execute format('create policy %I on %I for insert with check (can_write_finance(organization_id))', t||'_ins', t);
    execute format('create policy %I on %I for update using (can_approve(organization_id))', t||'_upd', t);
  end loop;
  foreach t in array array['ai_agents','integrations']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(organization_id))', t||'_sel', t);
    execute format('create policy %I on %I for all using (can_admin(organization_id)) with check (can_admin(organization_id))', t||'_all', t);
  end loop;
end $$;

-- Subscriptions and billing events: members read; written only by the service role.
alter table subscriptions enable row level security;
create policy sub_sel on subscriptions for select using (is_member(organization_id));
alter table billing_events enable row level security;
create policy be_sel on billing_events for select using (can_admin(organization_id));
-- Usage: members read; inserts via service role only.
alter table usage_records enable row level security;
create policy usage_sel on usage_records for select using (is_member(organization_id));
-- Audit: finance leads read; members insert as themselves; immutable (no update/delete policies).
alter table audit_logs enable row level security;
create policy audit_sel on audit_logs for select using (can_approve(organization_id));
create policy audit_ins on audit_logs for insert with check (is_member(organization_id) and user_id = auth.uid());

-- ============ Org bootstrap ============
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name) values (new.id, new.email, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  update organization_members set user_id = new.id, status = 'active' where lower(invited_email) = lower(new.email) and user_id is null;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function create_organization(p_name text, p_type text, p_currency text, p_structure text) returns uuid
language plpgsql security definer set search_path = public as $$
declare org uuid; begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into organizations (name, business_type, primary_currency, structure, created_by) values (p_name, p_type, upper(p_currency), p_structure, auth.uid()) returning id into org;
  insert into organization_members (organization_id, user_id, role) values (org, auth.uid(), 'owner');
  insert into organization_settings (organization_id) values (org);
  insert into subscriptions (organization_id) values (org);
  insert into ai_agents (organization_id, key, name, purpose, capabilities, data_scope) values
   (org,'financial','Financial Intelligence Agent','Explains the overall financial position and what needs attention.',array['Position summary','Risk detection'],array['invoices','payments','customers']),
   (org,'receivables','Receivables Intelligence Agent','Finds overdue, concentrated and ageing receivables.',array['Aging analysis','Concentration risk'],array['invoices','payments','customers']),
   (org,'reconciliation','Payment Reconciliation Agent','Explains reconciliation discrepancies for human review.',array['Discrepancy explanation','Duplicate detection'],array['invoices','payments','bank_transactions']),
   (org,'cashflow','Cash Flow Forecasting Agent','Explains forecasts, assumptions and potential shortfalls.',array['Forecast narrative','Shortfall alerts'],array['invoices','payments','expenses','supplier_obligations']),
   (org,'collections','Collections Strategy Agent','Prioritises accounts and drafts reminders for approval.',array['Priority scoring','Reminder drafts'],array['invoices','customers','collection_activities']),
   (org,'profitability','Profitability Intelligence Agent','Analyses income, costs and discounts where cost data exists.',array['Margin analysis'],array['invoices','expenses','customers']),
   (org,'executive','Executive Reporting Agent','Writes management summaries from calculated figures.',array['Executive summary'],array['calculated metrics']);
  insert into integrations (organization_id, provider) select org, p from unnest(array['quickbooks','xero','stripe','paystack','flutterwave','bank_feeds']) p;
  insert into audit_logs (organization_id, user_id, action, entity, entity_id) values (org, auth.uid(), 'organization.created', 'organization', org::text);
  return org;
end $$;

-- ============ Storage ============
insert into storage.buckets (id, name, public) values ('financial-files','financial-files', false) on conflict do nothing;
create policy "org files read" on storage.objects for select using (bucket_id='financial-files' and is_member(((storage.foldername(name))[1])::uuid));
create policy "org files write" on storage.objects for insert with check (bucket_id='financial-files' and can_write_finance(((storage.foldername(name))[1])::uuid));
