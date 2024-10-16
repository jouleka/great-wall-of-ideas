import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const { data, error } = await supabase
      .from('Views')
      .insert({ name: 'random name' })
      .select()

    if (error) {
      console.error('Error inserting view:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error in view insertion:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}