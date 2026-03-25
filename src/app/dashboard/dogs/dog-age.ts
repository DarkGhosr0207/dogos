export function ageLabelFromDateOfBirth(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '—'

  const birth = new Date(`${dateOfBirth}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return '—'

  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  const dayDiff = now.getDate() - birth.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1
  }

  if (years >= 1) {
    return `${years} yr${years === 1 ? '' : 's'}`
  }

  let months = (now.getFullYear() - birth.getFullYear()) * 12
  months += now.getMonth() - birth.getMonth()
  if (dayDiff < 0) months -= 1
  months = Math.max(0, months)

  if (months < 1) {
    const msPerDay = 86400000
    const days = Math.max(
      0,
      Math.floor((now.getTime() - birth.getTime()) / msPerDay)
    )
    return `${days} day${days === 1 ? '' : 's'}`
  }

  return `${months} mo`
}
