import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')

const ignoredDirectoryNames = new Set([
  '.git',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
])

const testFilePattern = /\.(?:test|spec)\.tsx?$/

export type TestCoverageAuditInput = {
  testFiles: string[]
  rootScripts: Record<string, string>
  backendScripts: Record<string, string>
  e2eSmokeContent: string
  playwrightConfigContent: string
}

export type TestCoverageAuditResult = {
  checkedTestFiles: number
  checkedRootTestScripts: number
  findings: string[]
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

function splitPackageScriptCommands(...scripts: string[]) {
  return scripts.flatMap((script) =>
    script
      .split(/\s*&&\s*/)
      .map((command) => command.trim())
      .filter(Boolean),
  )
}

function normalizeCommand(command: string) {
  return command.replace(/\\/g, '/')
}

function collectBunTestFileReferences(commands: string[]) {
  const references = new Set<string>()

  for (const command of commands.map(normalizeCommand)) {
    const match = command.match(/\bbun\s+test\s+(.+)$/)
    if (!match) continue

    for (const rawToken of match[1].split(/\s+/)) {
      const token = rawToken.trim().replace(/^['"]|['"]$/g, '')
      if (testFilePattern.test(token)) references.add(normalizePath(token))
    }
  }

  return references
}

export function auditTestCoverage(input: TestCoverageAuditInput): TestCoverageAuditResult {
  const testFiles = [...new Set(input.testFiles.map(normalizePath))].sort()
  const testFileSet = new Set(testFiles)
  const rootCommands = splitPackageScriptCommands(...Object.values(input.rootScripts))
  const qaRepoCommands = splitPackageScriptCommands(input.rootScripts['qa:repo'] ?? '')
  const bunTestReferences = collectBunTestFileReferences(rootCommands)
  const findings: string[] = []

  for (const file of testFiles.filter((path) => path.startsWith('scripts/'))) {
    if (!bunTestReferences.has(file)) {
      findings.push(`${file} เป็น test ใน scripts/ แต่ยังไม่มี root package script ที่รันไฟล์นี้ตรง ๆ`)
    }
  }

  for (const reference of bunTestReferences) {
    if (!testFileSet.has(reference)) {
      findings.push(`package.json อ้าง bun test ${reference} แต่ไม่พบไฟล์ test นี้ใน repo`)
    }
  }

  const rootTestScripts = Object.entries(input.rootScripts)
    .filter(([name, command]) => name.endsWith(':test') && /\bbun\s+test\b/.test(command))
    .map(([name]) => name)
    .sort()

  for (const scriptName of rootTestScripts) {
    if (!qaRepoCommands.includes(`bun run ${scriptName}`)) {
      findings.push(`package.json qa:repo ยังไม่ได้รัน bun run ${scriptName}`)
    }
  }

  const backendTestFiles = testFiles.filter((path) => path.startsWith('apps/backend/src/'))
  if (backendTestFiles.length > 0) {
    const backendCheck = input.rootScripts['backend:check'] ?? ''
    const backendDeployCheck = input.backendScripts['deploy:check'] ?? ''
    if (!backendCheck.includes('cd apps/backend') || !backendCheck.includes('bun run deploy:check')) {
      findings.push('backend test suite มีไฟล์ test แต่ root backend:check ยังไม่ได้ชี้ไป apps/backend deploy:check')
    }
    if (!/\bbun\s+test\b/.test(backendDeployCheck)) {
      findings.push('backend deploy:check ต้องรัน bun test เพื่อครอบ apps/backend/src/*.test.ts')
    }
    if (!qaRepoCommands.includes('bun run backend:check')) {
      findings.push('package.json qa:repo ต้องรัน bun run backend:check เพื่อครอบ backend tests')
    }
  }

  const e2eSpecFiles = testFiles.filter((path) => path.startsWith('tests/e2e/'))
  if (e2eSpecFiles.length > 0) {
    if (!input.playwrightConfigContent.includes("testDir: './tests/e2e'")) {
      findings.push('playwright.config.ts ต้องชี้ testDir ไปที่ ./tests/e2e เพื่อครอบ e2e specs')
    }
    if (!input.e2eSmokeContent.includes('playwright.config.ts')) {
      findings.push('scripts/e2e-smoke.ts ต้องรัน Playwright ด้วย playwright.config.ts')
    }
    if (!splitPackageScriptCommands(input.rootScripts['qa:full'] ?? '').includes('bun run e2e:smoke')) {
      findings.push('package.json qa:full ต้องรัน bun run e2e:smoke เพื่อครอบ browser e2e specs')
    }
  }

  for (const file of testFiles) {
    const knownScope =
      file.startsWith('scripts/') || file.startsWith('apps/backend/src/') || file.startsWith('tests/e2e/')
    if (!knownScope) {
      findings.push(`${file} เป็น test scope ใหม่ ต้องเพิ่ม coverage rule หรือ package script ให้ชัดเจน`)
    }
  }

  return {
    checkedTestFiles: testFiles.length,
    checkedRootTestScripts: rootTestScripts.length,
    findings,
  }
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (ignoredDirectoryNames.has(entry.name)) return []

      const fullPath = join(directory, entry.name)
      if (entry.isDirectory()) return walkFiles(fullPath)
      if (!entry.isFile()) return []
      return [fullPath]
    }),
  )

  return files.flat()
}

export async function collectRepoOwnedTestFiles(rootDir = root) {
  const files = await walkFiles(rootDir)
  return files
    .map((file) => normalizePath(relative(rootDir, file)))
    .filter((file) => testFilePattern.test(file))
    .sort()
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

async function readPackageScripts(path: string) {
  const packageJson = JSON.parse(await readRepoFile(path)) as { scripts?: Record<string, string> }
  return packageJson.scripts ?? {}
}

export async function collectTestCoverageAuditResult(): Promise<TestCoverageAuditResult> {
  return auditTestCoverage({
    testFiles: await collectRepoOwnedTestFiles(),
    rootScripts: await readPackageScripts('package.json'),
    backendScripts: await readPackageScripts('apps/backend/package.json'),
    e2eSmokeContent: await readRepoFile('scripts/e2e-smoke.ts'),
    playwrightConfigContent: await readRepoFile('playwright.config.ts'),
  })
}

export async function runTestCoverageAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectTestCoverageAuditResult()

  if (result.findings.length > 0) {
    writeError('ตรวจ test coverage ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(
    `ผ่าน - ตรวจ test coverage แล้ว (${result.checkedTestFiles} ไฟล์ทดสอบ, ${result.checkedRootTestScripts} root test scripts)`,
  )
  return 0
}

if (import.meta.main) process.exit(await runTestCoverageAudit())
