'use client'

import { useState } from 'react'
import AddDogForm from './AddDogForm'

const addDogBtnStyle = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '8px 18px',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: '500',
} as const

export default function AddDogTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={addDogBtnStyle}
      >
        Add dog
      </button>
      {open ? <AddDogForm onClose={() => setOpen(false)} /> : null}
    </>
  )
}
