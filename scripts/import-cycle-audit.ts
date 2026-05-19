import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import ts from 'typescript'

const root = join(import.meta.dir, '..')
const scannedRoots = ['apps/backend/index.ts', 'apps/backend/src', 'apps/frontend/src']
const sourceExtensions = ['.ts', '.tsx']

export type SourceInput = {
  file: string
  content: string
}

export type ImportGraph = Map<string, string[]>

export type ImportCycleAuditResult = {
  ok: boolean
  fileCount: number
  edgeCount: number
  cycles: string[][]
}

function normalizeRepoPath(value: string) {
  return value.replaceAll('\\', '/').replace(/\/+/g, '/')
}

function shouldScanSourceFile(file: string) {
  if (!/\.(ts|tsx)$/.test(file)) return false
  if (/\.(test|spec)\.(ts|tsx)$/.test(file)) return false
  if (file.endsWith('.d.ts')) return false
  return true
}

export async function collectSourceFiles(target: string): Promise<string[]> {
  const stats = await stat(target)
  if (stats.isFile()) return shouldScanSourceFile(target) ? [target] : []
  if (!stats.isDirectory()) return []

  const entries = await readdir(target, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = join(target, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(fullPath)
      return shouldScanSourceFile(fullPath) ? [fullPath] : []
    }),
  )
  return nested.flat()
}

export function extractRelativeImports(file: string, content: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const imports: string[] = []

  function collectModuleSpecifier(moduleSpecifier: ts.Expression | undefined) {
    if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text.startsWith('.')) {
      imports.push(moduleSpecifier.text)
    }
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      collectModuleSpecifier(node.moduleSpecifier)
    } else if (ts.isExportDeclaration(node)) {
      collectModuleSpecifier(node.moduleSpecifier)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith('.')
    ) {
      imports.push(node.arguments[0].text)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports
}

export function resolveRelativeImport(file: string, specifier: string, knownFiles: Set<string>) {
  const base = normalizeRepoPath(join(dirname(file), specifier))
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => `${base}/index${extension}`),
  ]

  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null
}

export function buildImportGraphFromSources(sources: SourceInput[]): ImportGraph {
  const knownFiles = new Set(sources.map((source) => normalizeRepoPath(source.file)))
  const graph: ImportGraph = new Map()

  for (const source of sources) {
    const file = normalizeRepoPath(source.file)
    const imports = extractRelativeImports(file, source.content)
      .map((specifier) => resolveRelativeImport(file, specifier, knownFiles))
      .filter((dependency): dependency is string => Boolean(dependency))

    graph.set(file, [...new Set(imports)].sort())
  }

  return graph
}

function cycleKey(cycle: string[]) {
  const nodes = cycle.slice(0, -1)
  const startIndex = nodes.reduce((bestIndex, node, index) => (node < nodes[bestIndex] ? index : bestIndex), 0)
  const rotated = [...nodes.slice(startIndex), ...nodes.slice(0, startIndex)]
  return [...rotated, rotated[0]].join(' -> ')
}

export function findImportCycles(graph: ImportGraph) {
  const cycles = new Map<string, string[]>()
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  function visit(file: string) {
    if (visiting.has(file)) {
      const startIndex = stack.indexOf(file)
      if (startIndex >= 0) {
        const cycle = [...stack.slice(startIndex), file]
        cycles.set(cycleKey(cycle), cycle)
      }
      return
    }
    if (visited.has(file)) return

    visiting.add(file)
    stack.push(file)

    for (const dependency of graph.get(file) ?? []) {
      if (graph.has(dependency)) visit(dependency)
    }

    stack.pop()
    visiting.delete(file)
    visited.add(file)
  }

  for (const file of [...graph.keys()].sort()) visit(file)
  return [...cycles.keys()].sort().map((key) => cycles.get(key) ?? [])
}

export async function collectImportCycleAuditResult(): Promise<ImportCycleAuditResult> {
  const files = (
    await Promise.all(scannedRoots.map((path) => collectSourceFiles(join(root, path))))
  )
    .flat()
    .sort()
  const sources = await Promise.all(
    files.map(async (file) => ({
      file: normalizeRepoPath(relative(root, file)),
      content: await readFile(file, 'utf8'),
    })),
  )
  const graph = buildImportGraphFromSources(sources)
  const cycles = findImportCycles(graph)
  const edgeCount = [...graph.values()].reduce((total, dependencies) => total + dependencies.length, 0)

  return {
    ok: cycles.length === 0,
    fileCount: graph.size,
    edgeCount,
    cycles,
  }
}

export async function runImportCycleAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectImportCycleAuditResult()

  if (!result.ok) {
    writeError('Import cycle audit failed:')
    for (const cycle of result.cycles) writeError(`- ${cycle.join(' -> ')}`)
    return 1
  }

  writeLine(`ok - import cycle audit passed (${result.fileCount} files, ${result.edgeCount} edges)`)
  return 0
}

if (import.meta.main) process.exit(await runImportCycleAudit())
