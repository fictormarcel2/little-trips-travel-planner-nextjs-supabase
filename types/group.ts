// Canonical row shapes for groups/group_invites (supabase/schema_consolidated_DRAFT.sql).
// Pages typically select a subset of these columns — use Pick<Group, ...> /
// Pick<GroupInvite, ...> at the call site rather than redefining a narrower
// inline shape per page.
export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

/**
 * A group's chosen cover photo (supabase/migrations/0007_group_covers.sql).
 *
 * Absence of a row is meaningful and is the common case: it means "this group
 * never picked one", and the UI falls back to coverFor(group.id). So this is
 * always handled as `GroupCover | null`, never as a Group field that happens
 * to be null.
 *
 * `cover` is one prefixed string, never two nullable fields, because a cover
 * is one of exactly two things and never both:
 *
 *   "registry:<id>"                    -> resolve with coverById(id)
 *   "upload:<userId>/<groupId>.<ext>"  -> a path in the group-covers bucket
 *
 * The database CHECK constraint enforces both shapes, so a row that exists is
 * a row whose shape has already been validated.
 */
export interface GroupCover {
  group_id: string;
  cover: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}
