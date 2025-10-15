import React from 'react'
import { AppProviders } from './stores/AppProviders'
import { AppShell } from './components/layout/AppShell'
import { GalleryGrid } from './components/gallery/GalleryGrid'

function App() {
  return (
    <AppProviders>
      <AppShell>
        <GalleryGrid />
      </AppShell>
    </AppProviders>
  )
}

export default App
