import React from 'react'
import { AppProviders } from './stores/AppProviders'
import { AppShell } from './components/layout/AppShell'
import { GalleryGrid } from './components/gallery/GalleryGrid'
import { MigrationGate } from './components/migration/MigrationGate'

function App() {
  return (
    <AppProviders>
      <MigrationGate>
        <AppShell>
          <GalleryGrid />
        </AppShell>
      </MigrationGate>
    </AppProviders>
  )
}

export default App
