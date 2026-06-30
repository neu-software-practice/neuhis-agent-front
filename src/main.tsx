import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { installZodErrorMap } from '@/lib/zod-error-map'
import { router } from '@/app/router'
import './globals.css'

installZodErrorMap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
