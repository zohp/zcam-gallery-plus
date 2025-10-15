import React from 'react'
import { useTheme } from '../../stores/SettingsContext'
import styles from './ThemeToggle.module.css'

/**
 * ThemeToggle - Light/dark mode switch
 * Provides accessible theme switching with visual feedback
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className={`${styles.toggleTrack} ${styles[theme]}`}>
        <div className={`${styles.toggleThumb} ${styles[theme]}`}>
          <span className={styles.icon}>
            {theme === 'light' ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
      <span className={styles.label}>
        {theme === 'light' ? 'Dark' : 'Light'}
      </span>
    </button>
  )
}
