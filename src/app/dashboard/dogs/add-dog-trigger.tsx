'use client'

import { useState } from 'react'
import AddDogForm from './AddDogForm'

export default function AddDogTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
      >
        Add dog
      </button>
      {open ? <AddDogForm onClose={() => setOpen(false)} /> : null}
    </>
  )
}
