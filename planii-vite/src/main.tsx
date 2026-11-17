import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import App from './App'
import './index.css'
import './project-v3.css'
import { applyTheme, getTheme } from './lib/theme'
import { autoLabelFields } from './lib/a11yFields'

applyTheme(getTheme())
autoLabelFields()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
