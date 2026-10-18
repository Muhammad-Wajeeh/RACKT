import { supabase } from './supabase'

/**
 * Saves the display name and profile picture on the signed-in user (in their auth metadata).
 * `avatarPath` is a path in the photo bucket, or null to remove the picture. The auth listener
 * in AuthContext picks up the change, so the UI updates on its own.
 */
export async function updateProfile(values: {
  displayName: string
  avatarPath: string | null
}): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: values.displayName, avatar_path: values.avatarPath },
  })
  if (error) throw error
}
