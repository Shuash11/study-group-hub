-- 0005: group owner can manage members (remove them from the group).
-- The original owner UPDATE policy was dropped in 0004 as unsafe; this adds the
-- safe version of the real use case: owners may delete plain member rows, never
-- owner rows (use "delete group" for that) and never other people's rows.
-- The 0004 trg_cleanup_rsvps trigger fires on any membership delete, so removed
-- members' RSVPs are cleaned up automatically.

create policy "Group owners can remove members"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
    and role = 'member'
  );
