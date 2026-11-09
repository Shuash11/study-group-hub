-- 0004: security-review hardening (SEC-01, PR-01, PR-02, INF-05 partial).

-- SEC-01: no product feature updates membership rows, and the policy allowed a
-- group owner to repoint a member row to an arbitrary user/role. Drop it.
drop policy if exists "Group owners manage member roles" on public.group_members;

-- PR-01: pin definer functions to an empty search path (pg_catalog stays implicit;
-- every reference in these bodies is schema-qualified).
alter function public.is_group_member(uuid) set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.handle_new_group() set search_path = '';
alter function public.recompute_member_count() set search_path = '';
alter function public.join_group_by_code(text) set search_path = '';

revoke create on schema public from anon;
revoke create on schema public from authenticated;

-- PR-02: leaving a group (or being removed) takes the user's RSVPs with them,
-- so former members' attendance choices don't linger in the group's roster.
create or replace function public.cleanup_rsvps_on_membership_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.session_rsvps sr
  using public.study_sessions ss
  where sr.session_id = ss.id
    and ss.group_id = old.group_id
    and sr.user_id = old.user_id;
  return old;
end;
$$;

create trigger trg_cleanup_rsvps
  before delete on public.group_members
  for each row
  execute function public.cleanup_rsvps_on_membership_end();
