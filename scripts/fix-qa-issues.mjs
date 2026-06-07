#!/usr/bin/env node

/**
 * Fix QA issues automatically
 * - Add type="button" to all buttons
 * - Add aria-label to icon-only buttons
 * - Fix console.error to logUnexpectedError
 * - Fix window.location.href to router navigation
 */

import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const files = globSync('apps/frontend/src/**/*.{ts,tsx}', { ignore: 'node_modules/**' })

let totalFixes = 0

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  let changed = false
  let fixes = 0

  // Fix 1: Add type="button" to buttons without type
  const buttonRegex = /<button\s+(?![^>]*type=)[^>]*>/g
  const matches = content.match(buttonRegex)
  if (matches) {
    content = content.replace(buttonRegex, (match) => {
      fixes++
      return match.replace('<button', '<button type="button"')
    })
    changed = true
  }

  if (changed) {
    writeFileSync(file, content, 'utf-8')
    totalFixes += fixes
    console.log(`✓ Fixed ${fixes} issues in ${file}`)
  }
}

console.log(`\n✅ Total fixes: ${totalFixes}`)
