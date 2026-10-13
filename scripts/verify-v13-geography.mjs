import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_PATH = resolve(ROOT, 'src/domain/geographic-configuration/workbook-data.ts')
const source = readFileSync(SOURCE_PATH, 'utf8')

function extractArray(name) {
  const pattern = new RegExp(`export const ${name}: [^=]+ = (\\[[\\s\\S]*?\\n\\])`, 'm')
  const match = source.match(pattern)
  if (!match) throw new Error(`Missing ${name}`)
  return JSON.parse(match[1])
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function duplicates(rows, key) {
  const seen = new Set()
  const duplicateValues = new Set()
  for (const row of rows) {
    const value = String(row[key] ?? '').trim()
    if (seen.has(value)) duplicateValues.add(value)
    seen.add(value)
  }
  return [...duplicateValues]
}

function uniqueValues(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function deriveCountries(countries, timeZones) {
  const selected = new Set(timeZones)
  return uniqueValues(countries.filter((country) => selected.has(country.timeZone)).map((country) => country.countryName))
}

function deriveStates(states, timeZones) {
  const selected = new Set(timeZones)
  return uniqueValues(states.filter((state) => selected.has(state.timeZone)).map((state) => state.state))
}

const countries = extractArray('GEOGRAPHIC_COUNTRY_SOURCE')
const states = extractArray('GEOGRAPHIC_US_STATE_SOURCE')
const timeGroups = extractArray('V1_3_TIME_GROUP_LOOKUP_SOURCE')
const utcPattern = /^UTC[+-]\d{2}:\d{2}$/
const validRegions = new Set(['NA', 'EMEA', 'APAC', 'LATAM'])

assert(countries.length === 251, `Expected 251 countries, found ${countries.length}`)
assert(states.length === 50, `Expected 50 US states, found ${states.length}`)
assert(timeGroups.length === 11, `Expected 11 Time Groups, found ${timeGroups.length}`)

for (const key of ['id', 'countryName', 'countryCodeName']) {
  assert(duplicates(countries, key).length === 0, `Duplicate country ${key}: ${duplicates(countries, key).join(', ')}`)
}
for (const country of countries) {
  assert(country.countryName && country.countryCodeName && country.region && country.timeZone, `Missing country value in ${JSON.stringify(country)}`)
  assert(validRegions.has(country.region), `Invalid country region ${country.region} for ${country.countryName}`)
  assert(utcPattern.test(country.timeZone), `Invalid country UTC ${country.timeZone} for ${country.countryName}`)
}

for (const key of ['id', 'state']) {
  assert(duplicates(states, key).length === 0, `Duplicate US state ${key}: ${duplicates(states, key).join(', ')}`)
}
for (const state of states) {
  assert(state.state && state.timeZone, `Missing US state value in ${JSON.stringify(state)}`)
  assert(utcPattern.test(state.timeZone), `Invalid US state UTC ${state.timeZone} for ${state.state}`)
}

for (const group of timeGroups) {
  assert(group.id && group.timeGroup && Array.isArray(group.timeZones), `Missing Time Group key fields in ${JSON.stringify(group)}`)
  assert(group.timeZones.length > 0, `Time Group ${group.timeGroup} has no Time Zones`)
  for (const timeZone of group.timeZones) assert(utcPattern.test(timeZone), `Invalid Time Group UTC ${timeZone} for ${group.timeGroup}`)
  assert(
    JSON.stringify(deriveCountries(countries, group.timeZones)) === JSON.stringify([...group.countries].sort((a, b) => a.localeCompare(b))),
    `Time Group ${group.timeGroup} Countries are not derived from selected Time Zones`,
  )
  assert(
    JSON.stringify(deriveStates(states, group.timeZones)) === JSON.stringify([...group.states].sort((a, b) => a.localeCompare(b))),
    `Time Group ${group.timeGroup} States are not derived from selected Time Zones`,
  )
}

const mutableCountries = countries.map((country) => ({ ...country }))
mutableCountries[0] = { ...mutableCountries[0], timeZone: 'UTC+13:00' }
assert(
  deriveCountries(mutableCountries, ['UTC+13:00']).includes(mutableCountries[0].countryName),
  'Derived Countries do not react to Country master Time Zone changes',
)

console.log('V1.3 geography verification passed')
console.log(`Countries: ${countries.length}`)
console.log(`US states: ${states.length}`)
console.log(`Time Groups: ${timeGroups.length}`)
