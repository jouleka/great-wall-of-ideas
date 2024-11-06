import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function uploadProfileImage(file: File, userId: string) {
  const supabase = createClientComponentClient()
  
  try {
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file')
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image size should be less than 5MB')
    }

    // Create filename with user ID for consistent overwriting
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`

    // Upload to avatars bucket with upsert to replace existing
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return publicUrl
  } catch (error) {
    throw error
  }
} 