import { useState } from 'react'
import ManageTeam from './ManageTeam'
import ManageLocations from './ManageLocations'
import styles from './Settings.module.css'

export default function Settings({ users, locations, activeLocationId, currentUser, isGlobalAdmin, onUsersChange, onLocationsChange, onToast }) {
  const [tab, setTab] = useState('team')

  return (
    <div>
      <div className={styles.toggle}>
        <button
          className={`${styles.toggleBtn} ${tab === 'team' ? styles.toggleActive : ''}`}
          onClick={() => setTab('team')}
        >Team</button>
        {isGlobalAdmin && (
          <button
            className={`${styles.toggleBtn} ${tab === 'locations' ? styles.toggleActive : ''}`}
            onClick={() => setTab('locations')}
          >Locations</button>
        )}
      </div>

      {tab === 'team' && (
        <ManageTeam
          users={users}
          locations={locations}
          activeLocationId={activeLocationId}
          currentUser={currentUser}
          isGlobalAdmin={isGlobalAdmin}
          onUsersChange={onUsersChange}
          onToast={onToast}
        />
      )}

      {tab === 'locations' && isGlobalAdmin && (
        <ManageLocations
          locations={locations}
          onLocationsChange={onLocationsChange}
          onToast={onToast}
        />
      )}
    </div>
  )
}