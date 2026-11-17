import { permanentRedirect } from 'next/navigation'

// The wall at /ideas is the home page. A permanent (308) redirect tells search
// engines to consolidate ranking signals for "/" onto /ideas.
export default function Home() {
  permanentRedirect('/ideas')
}
