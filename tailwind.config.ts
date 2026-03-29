/** Ensures arbitrary hex utilities from the design system are always generated. */
const safelist = [
  'bg-[#f7f9f7]',
  'bg-[#1a2e1f]',
  'bg-[#2d4a34]',
  'text-[#8aab8f]',
  'border-[#2d4a34]',
  'border-[#e8ede8]',
  'bg-[#2d7a4f]',
  'hover:bg-[#236040]',
  'text-[#2d7a4f]',
  'hover:text-[#236040]',
  'bg-[#e8f5ed]',
  'border-[#2d7a4f]',
  'hover:border-[#2d7a4f]',
  'hover:text-[#2d7a4f]',
  'focus:border-[#2d7a4f]',
  'focus:ring-[#2d7a4f]',
  'border-[#b8ddc8]',
  'text-[#1a1a1a]',
  'hover:shadow-md',
  'hover:border-[#2d7a4f]',
] as const

const config: { safelist: string[] } = {
  safelist: [...safelist],
}

export default config
