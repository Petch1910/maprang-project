import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = join(import.meta.dir, '..')
const scannedTargets = ['apps/backend/index.ts', 'apps/backend/src', 'apps/backend/prisma']

export type BackendSecurityFinding = {
  file: string
  line: number
  message: string
}

function shouldScanSourceFile(file: string) {
  if (!/\.(ts|tsx)$/.test(file)) return false
  if (/\.(test|spec)\.(ts|tsx)$/.test(file)) return false
  return true
}

export async function collectSourceFiles(target: string): Promise<string[]> {
  const targetStat = await stat(target)
  if (targetStat.isFile()) return shouldScanSourceFile(target) ? [target] : []
  if (!targetStat.isDirectory()) return []

  const entries = await readdir(target, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(target, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(fullPath)
      return shouldScanSourceFile(fullPath) ? [fullPath] : []
    }),
  )
  return nested.flat()
}

function lineFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const routeMethods = new Set(['get', 'post', 'patch', 'put', 'delete'])
const variableTypeAnnotation = String.raw`(?:\s*:\s*[^=;,\n]+)?`
const aliasValueTerminator = String.raw`(?=\s*(?:[;,\n)\]}]|$|\s+(?:as|satisfies)\b))`
const callMethodAccessor = String.raw`(?:(?:\?\.|\.)\s*call|(?:\?\.)?\s*\[\s*["']call["']\s*\])`
const applyMethodAccessor = String.raw`(?:(?:\?\.|\.)\s*apply|(?:\?\.)?\s*\[\s*["']apply["']\s*\])`
const callOrApplyMethodAccessor = String.raw`(?:${callMethodAccessor}|${applyMethodAccessor})`
const bindMethodAccessor = String.raw`(?:(?:\?\.|\.)\s*bind|(?:\?\.)?\s*\[\s*["']bind["']\s*\])`
const globalNamespaceObjectAccessor = String.raw`(?:globalThis|\(\s*globalThis\s*\))`
const globalReflectObjectAccessor = String.raw`${globalNamespaceObjectAccessor}\s*(?:(?:\?\.|\.)\s*Reflect\b|(?:\?\.)?\s*\[\s*["']Reflect["']\s*\])`
const globalObjectObjectAccessor = String.raw`${globalNamespaceObjectAccessor}\s*(?:(?:\?\.|\.)\s*Object\b|(?:\?\.)?\s*\[\s*["']Object["']\s*\])`
const reflectObjectAccessor = String.raw`(?:Reflect\b|${globalReflectObjectAccessor})`
const objectAccessor = String.raw`(?:Object\b|${globalObjectObjectAccessor})`
const readonlyContainerPrefix = String.raw`(?:${objectAccessor}\s*(?:(?:\?\.|\.)\s*(?:freeze|seal)|(?:\?\.)?\s*\[\s*["'](?:freeze|seal)["']\s*\])\s*\(\s*)?`
const objectFromEntriesContainerPrefix = String.raw`${objectAccessor}\s*(?:(?:\?\.|\.)\s*fromEntries|(?:\?\.)?\s*\[\s*["']fromEntries["']\s*\])\s*\(`
const objectAssignContainerPrefix = String.raw`${objectAccessor}\s*(?:(?:\?\.|\.)\s*assign|(?:\?\.)?\s*\[\s*["']assign["']\s*\])\s*\(`
const objectDefinePropertyContainerPrefix = String.raw`${objectAccessor}\s*(?:(?:\?\.|\.)\s*definePropert(?:y|ies)|(?:\?\.)?\s*\[\s*["']definePropert(?:y|ies)["']\s*\])\s*\(`
const objectCreateContainerPrefix = String.raw`${objectAccessor}\s*(?:(?:\?\.|\.)\s*create|(?:\?\.)?\s*\[\s*["']create["']\s*\])\s*\(`
const collectionMutationContainerPrefix = String.raw`(?:\(\s*\b[A-Za-z_$][\w$]*\s*\)|\b[A-Za-z_$][\w$]*|\(\s*new\s+(?:Weak)?Map(?:\s*<[^>]+>)?\s*\([^)]*\)\s*\)|\(\s*new\s+(?:Weak)?Set(?:\s*<[^>]+>)?\s*\([^)]*\)\s*\)|new\s+(?:Weak)?Map(?:\s*<[^>]+>)?\s*\([^)]*\)|new\s+(?:Weak)?Set(?:\s*<[^>]+>)?\s*\([^)]*\))\s*(?:(?:\?\.|\.)\s*(?:set|add)|(?:\?\.)?\s*\[\s*["'](?:set|add)["']\s*\])\s*(?:\?\.)?\s*\(`
const collectionPrototypeMutationContainerPrefix = String.raw`(?:\(\s*)?(?:(?:(?:(?:window|globalThis)\s*(?:\?\.|\.)\s*)?(?:Weak)?Map|(?:window|globalThis)\s*(?:\?\.)?\s*\[\s*["'](?:Weak)?Map["']\s*\])\s*(?:\)\s*)?(?:(?:\?\.|\.)\s*prototype|(?:\?\.)?\s*\[\s*["']prototype["']\s*\])\s*(?:\)\s*)?(?:(?:\?\.|\.)\s*set|(?:\?\.)?\s*\[\s*["']set["']\s*\])|(?:(?:(?:window|globalThis)\s*(?:\?\.|\.)\s*)?(?:Weak)?Set|(?:window|globalThis)\s*(?:\?\.)?\s*\[\s*["'](?:Weak)?Set["']\s*\])\s*(?:\)\s*)?(?:(?:\?\.|\.)\s*prototype|(?:\?\.)?\s*\[\s*["']prototype["']\s*\])\s*(?:\)\s*)?(?:(?:\?\.|\.)\s*add|(?:\?\.)?\s*\[\s*["']add["']\s*\]))\s*(?:\)\s*)?(?:(?:\?\.|\.)\s*(?:call|apply|bind)|(?:\?\.)?\s*\[\s*["'](?:call|apply|bind)["']\s*\])\s*\(`
const reflectObjectAliasValue = String.raw`(?:\(\s*)?${reflectObjectAccessor}\s*(?:\)\s*)?${aliasValueTerminator}`
const reflectObjectAliasPattern = new RegExp(
  String.raw`(?:^|[;{\n])\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${reflectObjectAliasValue}|(?:^|[;{\n])\s*[A-Za-z_$][\w$]*\s*=\s*${reflectObjectAliasValue}`,
  'g',
)
const reflectObjectContainerAliasPattern = new RegExp(String.raw`(?::\s*${reflectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${reflectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${reflectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{\s*Reflect\b(?=\s*(?:[,}]|$))|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{[^}\n;]*?,\s*Reflect\b(?=\s*(?:[,}]|$))|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${reflectObjectAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?(?::\s*${reflectObjectAliasValue}|\{\s*Reflect\b(?=\s*(?:[,}]|$))|\{[^}\n;]*?,\s*Reflect\b(?=\s*(?:[,}]|$)))|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${reflectObjectAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${reflectObjectAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${reflectObjectAliasValue})`, 'g')
const objectObjectAliasValue = String.raw`(?:\(\s*)?${objectAccessor}\s*(?:\)\s*)?${aliasValueTerminator}`
const objectObjectAliasPattern = new RegExp(
  String.raw`(?:^|[;{\n])\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${objectObjectAliasValue}|(?:^|[;{\n])\s*[A-Za-z_$][\w$]*\s*=\s*${objectObjectAliasValue}`,
  'g',
)
const objectObjectContainerAliasPattern = new RegExp(String.raw`(?::\s*${objectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${objectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${objectObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{\s*Object\b(?=\s*(?:[,}]|$))|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{[^}\n;]*?,\s*Object\b(?=\s*(?:[,}]|$))|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${objectObjectAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?(?::\s*${objectObjectAliasValue}|\{\s*Object\b(?=\s*(?:[,}]|$))|\{[^}\n;]*?,\s*Object\b(?=\s*(?:[,}]|$)))|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${objectObjectAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${objectObjectAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${objectObjectAliasValue})`, 'g')
const reflectApplyAccessor = String.raw`${reflectObjectAccessor}\s*(?:(?:\?\.|\.)\s*apply|(?:\?\.)?\s*\[\s*["']apply["']\s*\])`
const reflectApplyCallPrefix = String.raw`(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?(?:\?\.)?\s*\(`
const reflectGetAccessor = String.raw`${reflectObjectAccessor}\s*(?:(?:\?\.|\.)\s*get|(?:\?\.)?\s*\[\s*["']get["']\s*\])`
const reflectGetCallPrefix = String.raw`(?:\(\s*)?${reflectGetAccessor}\s*(?:\)\s*)?(?:\?\.)?\s*\(`
const reflectGetMethodCallPrefix = String.raw`(?:\(\s*${reflectGetAccessor}\s*${callMethodAccessor}\s*\)|(?:\(\s*)?${reflectGetAccessor}\s*(?:\)\s*)?\s*${callMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*`
const reflectGetMethodApplyPrefix = String.raw`(?:\(\s*${reflectGetAccessor}\s*${applyMethodAccessor}\s*\)|(?:\(\s*)?${reflectGetAccessor}\s*(?:\)\s*)?\s*${applyMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*\[\s*`
const reflectGetMethodBindPrefix = String.raw`(?:\(\s*${reflectGetAccessor}\s*${bindMethodAccessor}\s*\)|(?:\(\s*)?${reflectGetAccessor}\s*(?:\)\s*)?\s*${bindMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([^)]*\)\s*(?:\)\s*)?(?:\?\.)?\s*\(`
const objectDescriptorAccessor = String.raw`${objectAccessor}\s*(?:(?:\?\.|\.)\s*getOwnPropertyDescriptor|(?:\?\.)?\s*\[\s*["']getOwnPropertyDescriptor["']\s*\])`
const objectDescriptorCallPrefix = String.raw`(?:\(\s*)?${objectDescriptorAccessor}\s*(?:\)\s*)?(?:\?\.)?\s*\(`
const objectDescriptorMethodCallPrefix = String.raw`(?:\(\s*${objectDescriptorAccessor}\s*${callMethodAccessor}\s*\)|(?:\(\s*)?${objectDescriptorAccessor}\s*(?:\)\s*)?\s*${callMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*`
const objectDescriptorMethodApplyPrefix = String.raw`(?:\(\s*${objectDescriptorAccessor}\s*${applyMethodAccessor}\s*\)|(?:\(\s*)?${objectDescriptorAccessor}\s*(?:\)\s*)?\s*${applyMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*\[\s*`
const objectDescriptorMethodBindPrefix = String.raw`(?:\(\s*${objectDescriptorAccessor}\s*${bindMethodAccessor}\s*\)|(?:\(\s*)?${objectDescriptorAccessor}\s*(?:\)\s*)?\s*${bindMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([^)]*\)\s*(?:\)\s*)?(?:\?\.)?\s*\(`
const forwardedRetrievalMethodAliasTarget = String.raw`(?:\(\s*)?(?:${reflectGetAccessor}|${objectDescriptorAccessor})\s*(?:\)\s*)?${callOrApplyMethodAccessor}`
const forwardedRetrievalMethodAliasValue = String.raw`${forwardedRetrievalMethodAliasTarget}${aliasValueTerminator}`
const boundRetrievalMethodAliasTarget = String.raw`(?:\(\s*)?(?:${reflectGetAccessor}|${objectDescriptorAccessor})\s*(?:\)\s*)?${bindMethodAccessor}\s*(?:\?\.)?\s*\([^)]*\)\s*(?:\)\s*)?`
const boundRetrievalMethodAliasValue = String.raw`${boundRetrievalMethodAliasTarget}${aliasValueTerminator}`
const retrievalMethodAliasTarget = String.raw`(?:${forwardedRetrievalMethodAliasTarget}|${boundRetrievalMethodAliasTarget}|(?:\(\s*)?(?:${reflectGetAccessor}|${objectDescriptorAccessor})\s*(?:\)\s*)?)`
const retrievalMethodAliasValue = String.raw`${retrievalMethodAliasTarget}${aliasValueTerminator}`
const retrievalMethodAliasPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${retrievalMethodAliasValue}|\b[A-Za-z_$][\w$]*\s*=\s*${retrievalMethodAliasValue}|\b(?:const|let|var)\s*\{[^}]*\bget\b[^}]*\}${variableTypeAnnotation}\s*=\s*${reflectObjectAliasValue}|\b(?:const|let|var)\s*\{[^}]*\bgetOwnPropertyDescriptor\b[^}]*\}${variableTypeAnnotation}\s*=\s*${objectObjectAliasValue}|\b(?:const|let|var)\s*\{[^}]*\b(?:call|apply)\b[^}]*\}${variableTypeAnnotation}\s*=\s*(?:${reflectGetAccessor}|${objectDescriptorAccessor})`,
  'g',
)
const retrievalMethodContainerAliasPattern = new RegExp(String.raw`(?:[:\[,])\s*${retrievalMethodAliasTarget}${aliasValueTerminator}`, 'g')
const consoleNamespaceRoot = String.raw`globalThis`
const consoleNamespaceObjectAccessor = String.raw`(?:${consoleNamespaceRoot}|\(\s*${consoleNamespaceRoot}\s*\))`
const consoleObjectAccessor = String.raw`(?:\bconsole\b|${consoleNamespaceObjectAccessor}\s*(?:(?:\?\.|\.)\s*console\b|(?:\?\.)?\s*\[\s*["']console["']\s*\]))`
const retrievedConsoleObjectValue = String.raw`(?:${reflectGetCallPrefix}\s*${consoleNamespaceObjectAccessor}\s*,\s*["']console["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodCallPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodApplyPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["'](?:\s*,[^\]]*)?\s*\]\s*\)|${reflectGetMethodBindPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["'](?:\s*,[^)]*)?\s*\)|(?:${objectDescriptorCallPrefix}\s*${consoleNamespaceObjectAccessor}\s*,\s*["']console["']\s*\)|${objectDescriptorMethodCallPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["']\s*\)|${objectDescriptorMethodApplyPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["']\s*\]\s*\)|${objectDescriptorMethodBindPrefix}${consoleNamespaceObjectAccessor}\s*,\s*["']console["']\s*\))\s*(?:\?\.|\.)\s*value)`
const consoleObjectValue = String.raw`(?:${consoleObjectAccessor}|${retrievedConsoleObjectValue})`
const consoleObjectMemberAccessor = String.raw`(?:${consoleObjectValue}|\(\s*${consoleObjectValue}\s*\))`
const consoleErrorWarnAccessor = String.raw`${consoleObjectMemberAccessor}\s*(?:(?:\?\.|\.)\s*(?:error|warn)|(?:\?\.)?\s*\[\s*["'](?:error|warn)["']\s*\])`
const consoleErrorWarnCallPrefix = String.raw`${consoleErrorWarnAccessor}(?:(?:\s*${callOrApplyMethodAccessor})?\s*(?:\?\.)?\s*\(|\s*${bindMethodAccessor}\s*(?:\?\.)?\s*\([^)]*\)\s*(?:\?\.)?\s*\()`
const reflectGetConsoleErrorWarnValue = String.raw`(?:${reflectGetCallPrefix}\s*${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodCallPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodApplyPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["'](?:\s*,[^\]]*)?\s*\]\s*\)|${reflectGetMethodBindPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["'](?:\s*,[^)]*)?\s*\))`
const reflectGetConsoleErrorWarnCallPrefix = String.raw`${reflectGetConsoleErrorWarnValue}\s*(?:\?\.)?\s*\(`
const reflectGetConsoleErrorWarnForwardPrefix = String.raw`${reflectGetConsoleErrorWarnValue}\s*(?:${callOrApplyMethodAccessor}\s*(?:\?\.)?\s*\(|${bindMethodAccessor}\s*(?:\?\.)?\s*\([^)]*\)\s*(?:\?\.)?\s*\()`
const descriptorConsoleErrorWarnValue = String.raw`(?:${objectDescriptorCallPrefix}\s*${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["']\s*\)|${objectDescriptorMethodCallPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["']\s*\)|${objectDescriptorMethodApplyPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["']\s*\]\s*\)|${objectDescriptorMethodBindPrefix}${consoleObjectMemberAccessor}\s*,\s*["'](?:error|warn)["']\s*\))\s*(?:\?\.|\.)\s*value`
const descriptorConsoleErrorWarnValueCallPrefix = String.raw`${descriptorConsoleErrorWarnValue}(?:(?:\s*${callOrApplyMethodAccessor})?\s*(?:\?\.)?\s*\(|\s*${bindMethodAccessor}\s*(?:\?\.)?\s*\([^)]*\)\s*(?:\?\.)?\s*\()`
const reflectConsoleErrorWarnApplyTarget = String.raw`(?:${consoleErrorWarnAccessor}|${reflectGetConsoleErrorWarnValue}|${descriptorConsoleErrorWarnValue})`
const reflectApplyMethodCallPrefix = String.raw`(?:\(\s*${reflectApplyAccessor}\s*${callMethodAccessor}\s*\)|(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?\s*${callMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*`
const reflectApplyMethodApplyPrefix = String.raw`(?:\(\s*${reflectApplyAccessor}\s*${applyMethodAccessor}\s*\)|(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?\s*${applyMethodAccessor})\s*(?:\)\s*)?(?:\?\.)?\s*\([\s\S]{0,120}?,\s*\[\s*`
const reflectApplyInvocationPrefix = String.raw`(?:${reflectApplyCallPrefix}|${reflectApplyMethodCallPrefix}|${reflectApplyMethodApplyPrefix})`
const reflectConsoleErrorWarnApplyPrefix = String.raw`${reflectApplyInvocationPrefix}\s*${reflectConsoleErrorWarnApplyTarget}\s*,[\s\S]*?\[\s*`
const consoleObjectAliasValue = String.raw`(?:\(\s*)?${consoleObjectValue}\s*(?:\)\s*)?${aliasValueTerminator}`
const consoleObjectAliasPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${consoleObjectAliasValue}|\b[A-Za-z_$][\w$]*\s*=\s*${consoleObjectAliasValue}`,
  'g',
)
const consoleObjectContainerAliasPattern = new RegExp(String.raw`(?::\s*${consoleObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${consoleObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${consoleObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{\s*(?:[^\}\n;]*?,\s*)?\bconsole\b\s*(?=[,\}])|new\s+Map(?:\s*<[^>]+>)?\s*\([\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${consoleObjectAliasValue}|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${consoleObjectAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?(?::\s*${consoleObjectAliasValue}|\{\s*(?:[^\}\n;]*?,\s*)?\bconsole\b\s*(?=[,\}]))|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${consoleObjectAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${consoleObjectAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${consoleObjectAliasValue}|(?:new\s+Set(?:\s*<[^>]+>)?|Array\s*\.\s*(?:from|of))\s*\([\s\S]{0,160}?(?:\[\s*)?${consoleObjectAliasValue})`, 'g')
const consoleErrorWarnAliasValue = String.raw`(?:\(\s*)?(?:${consoleErrorWarnAccessor}|${reflectGetConsoleErrorWarnValue}|${descriptorConsoleErrorWarnValue})\s*(?:\)\s*)?(?=\s*(?:[;,\n)\]}]|$|${bindMethodAccessor}|\s+(?:as|satisfies)\b))`
const consoleErrorWarnAliasPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${consoleErrorWarnAliasValue}|\b[A-Za-z_$][\w$]*\s*=\s*${consoleErrorWarnAliasValue}|\b(?:const|let|var)\s*\{[^}]*\b(?:error|warn)\b[^}]*\}${variableTypeAnnotation}\s*=\s*${consoleObjectAliasValue}`,
  'g',
)
const consoleErrorWarnContainerAliasPattern = new RegExp(String.raw`(?::\s*${consoleErrorWarnAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${consoleErrorWarnAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${consoleErrorWarnAliasValue}|new\s+Map(?:\s*<[^>]+>)?\s*\([\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${consoleErrorWarnAliasValue}|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${consoleErrorWarnAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?:\s*${consoleErrorWarnAliasValue}|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${consoleErrorWarnAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${consoleErrorWarnAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${consoleErrorWarnAliasValue}|(?:new\s+Set(?:\s*<[^>]+>)?|Array\s*\.\s*(?:from|of))\s*\([\s\S]{0,160}?(?:\[\s*)?${consoleErrorWarnAliasValue})`, 'g')
const promiseNamespaceRoot = String.raw`globalThis`
const promiseNamespaceObjectAccessor = String.raw`(?:${promiseNamespaceRoot}|\(\s*${promiseNamespaceRoot}\s*\))`
const promiseObjectAccessor = String.raw`(?:Promise|${promiseNamespaceObjectAccessor}\s*(?:(?:\?\.|\.)\s*Promise\b|(?:\?\.)?\s*\[\s*["']Promise["']\s*\]))`
const retrievedPromiseObjectValue = String.raw`(?:${reflectGetCallPrefix}\s*${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodCallPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodApplyPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["'](?:\s*,[^\]]*)?\s*\]\s*\)|${reflectGetMethodBindPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["'](?:\s*,[^)]*)?\s*\)|(?:${objectDescriptorCallPrefix}\s*${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["']\s*\)|${objectDescriptorMethodCallPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["']\s*\)|${objectDescriptorMethodApplyPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["']\s*\]\s*\)|${objectDescriptorMethodBindPrefix}${promiseNamespaceObjectAccessor}\s*,\s*["']Promise["']\s*\))\s*(?:\?\.|\.)\s*value)`
const promiseObjectValue = String.raw`(?:${promiseObjectAccessor}|${retrievedPromiseObjectValue})`
const promiseObjectMemberAccessor = String.raw`(?:${promiseObjectValue}|\(\s*${promiseObjectValue}\s*\))`
const promiseRejectAccessor = String.raw`${promiseObjectMemberAccessor}\s*(?:(?:\?\.|\.)\s*reject|(?:\?\.)?\s*\[\s*["']reject["']\s*\])`
const reflectGetPromiseRejectValue = String.raw`(?:${reflectGetCallPrefix}\s*${promiseObjectMemberAccessor}\s*,\s*["']reject["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodCallPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["'](?:\s*,[^)]*)?\s*\)|${reflectGetMethodApplyPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["'](?:\s*,[^\]]*)?\s*\]\s*\)|${reflectGetMethodBindPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["'](?:\s*,[^)]*)?\s*\))`
const descriptorPromiseRejectValue = String.raw`(?:${objectDescriptorCallPrefix}\s*${promiseObjectMemberAccessor}\s*,\s*["']reject["']\s*\)|${objectDescriptorMethodCallPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["']\s*\)|${objectDescriptorMethodApplyPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["']\s*\]\s*\)|${objectDescriptorMethodBindPrefix}${promiseObjectMemberAccessor}\s*,\s*["']reject["']\s*\))\s*(?:\?\.|\.)\s*value`
const retrievedPromiseRejectValue = String.raw`(?:${reflectGetPromiseRejectValue}|${descriptorPromiseRejectValue})`
const reflectPromiseRejectApplyPrefix = String.raw`${reflectApplyInvocationPrefix}\s*${promiseRejectAccessor}\s*,[\s\S]*?\[\s*`
const reflectRetrievedPromiseRejectApplyPrefix = String.raw`${reflectApplyInvocationPrefix}\s*${retrievedPromiseRejectValue}\s*,[\s\S]*?\[\s*`
const forwardedReflectApplyAliasTarget = String.raw`(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?${callOrApplyMethodAccessor}`
const forwardedReflectApplyAliasValue = String.raw`${forwardedReflectApplyAliasTarget}${aliasValueTerminator}`
const boundReflectApplyAliasTarget = String.raw`(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?${bindMethodAccessor}\s*(?:\?\.)?\s*\([^)]*\)\s*(?:\)\s*)?`
const boundReflectApplyAliasValue = String.raw`${boundReflectApplyAliasTarget}${aliasValueTerminator}`
const reflectApplyAliasTarget = String.raw`(?:${forwardedReflectApplyAliasTarget}|${boundReflectApplyAliasTarget}|(?:\(\s*)?${reflectApplyAccessor}\s*(?:\)\s*)?)`
const reflectApplyAliasValue = String.raw`${reflectApplyAliasTarget}${aliasValueTerminator}`
const reflectApplyAliasPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${reflectApplyAliasValue}|\b[A-Za-z_$][\w$]*\s*=\s*${reflectApplyAliasValue}|\b(?:const|let|var)\s*\{[^}]*\bapply\b[^}]*\}${variableTypeAnnotation}\s*=\s*${reflectObjectAliasValue}|\b(?:const|let|var)\s*\{[^}]*\b(?:call|apply)\b[^}]*\}${variableTypeAnnotation}\s*=\s*${reflectApplyAccessor}`,
  'g',
)
const reflectApplyContainerAliasPattern = new RegExp(String.raw`(?:[:\[,])\s*${reflectApplyAliasTarget}${aliasValueTerminator}`, 'g')
const promiseObjectAliasValue = String.raw`(?:\(\s*)?${promiseObjectValue}\s*(?:\)\s*)?${aliasValueTerminator}`
const promiseObjectAliasPattern = new RegExp(
  String.raw`(?:^|[;{\n])\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${promiseObjectAliasValue}|(?:^|[;{\n])\s*[A-Za-z_$][\w$]*\s*=\s*${promiseObjectAliasValue}`,
  'g',
)
const promiseObjectContainerAliasPattern = new RegExp(String.raw`(?::\s*${promiseObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${promiseObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${promiseObjectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\{\s*(?:[^\}\n;]*?,\s*)?\bPromise\b\s*(?=[,\}])|new\s+Map(?:\s*<[^>]+>)?\s*\([\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${promiseObjectAliasValue}|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${promiseObjectAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?(?::\s*${promiseObjectAliasValue}|\{\s*(?:[^\}\n;]*?,\s*)?\bPromise\b\s*(?=[,\}]))|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${promiseObjectAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${promiseObjectAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${promiseObjectAliasValue}|(?:new\s+Set(?:\s*<[^>]+>)?|Array\s*\.\s*(?:from|of))\s*\([\s\S]{0,160}?(?:\[\s*)?${promiseObjectAliasValue})`, 'g')
const promiseRejectAliasValue = String.raw`(?:${promiseRejectAccessor}|${retrievedPromiseRejectValue})${aliasValueTerminator}`
const promiseRejectAliasPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*${variableTypeAnnotation}\s*=\s*${promiseRejectAliasValue}|\b[A-Za-z_$][\w$]*\s*=\s*${promiseRejectAliasValue}|\b(?:const|let|var)\s*\{[^}]*\breject\b[^}]*\}${variableTypeAnnotation}\s*=\s*${promiseObjectMemberAccessor}`,
  'g',
)
const promiseRejectContainerAliasPattern = new RegExp(String.raw`(?::\s*${promiseRejectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[\s*${promiseRejectAliasValue}|=\s*${readonlyContainerPrefix}(?:\(\s*)?\[[^\]\n;]*?,\s*${promiseRejectAliasValue}|new\s+Map(?:\s*<[^>]+>)?\s*\([\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${promiseRejectAliasValue}|${objectFromEntriesContainerPrefix}[\s\S]{0,240}?\[\s*["'][^"'\n]+["']\s*,\s*${promiseRejectAliasValue}|${objectAssignContainerPrefix}[\s\S]{0,240}?:\s*${promiseRejectAliasValue}|${objectDefinePropertyContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${promiseRejectAliasValue}|${objectCreateContainerPrefix}[\s\S]{0,260}?\bvalue\s*:\s*${promiseRejectAliasValue}|${collectionMutationContainerPrefix}[\s\S]{0,160}?(?:["'][^"'\n]+["']\s*,\s*)?${promiseRejectAliasValue}|(?:new\s+Set(?:\s*<[^>]+>)?|Array\s*\.\s*(?:from|of))\s*\([\s\S]{0,160}?(?:\[\s*)?${promiseRejectAliasValue})`, 'g')
const reflectObjectPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${reflectObjectAliasValue}`, 'g')
const objectObjectPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${objectObjectAliasValue}`, 'g')
const consoleObjectPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${consoleObjectAliasValue}`, 'g')
const consoleErrorWarnPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${consoleErrorWarnAliasValue}`, 'g')
const promiseObjectPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${promiseObjectAliasValue}`, 'g')
const promiseRejectPrototypeMutationContainerAliasPattern = new RegExp(String.raw`${collectionPrototypeMutationContainerPrefix}[\s\S]{0,180}?${promiseRejectAliasValue}`, 'g')
const rawRouteErrorResponsePattern = /return\s+\{(?=[^}]*\berror\s*:)(?![^}]*\bmessage\s*:)[^}]*\}/g
const rawRouteErrorLogPattern = new RegExp(
  `${consoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}|${reflectConsoleErrorWarnApplyPrefix}[\\s\\S]*?${rawErrorArrayElementPatternFor('error')}|${reflectGetConsoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}|${reflectGetConsoleErrorWarnForwardPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}|${descriptorConsoleErrorWarnValueCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`,
  'g',
)
const rawRouteErrorThrowPattern = new RegExp(`throw\\s*(?:\\(\\s*)?${rawErrorExpressionPatternFor('error')}`, 'g')
const rawRouteErrorReturnPattern = new RegExp(
  `\\breturn\\s*(?:\\(\\s*)?${rawErrorExpressionPatternFor('error')}[ \\t]*(?:\\)[ \\t]*)?(?:;|$)`,
  'gm',
)
const rawRouteErrorRejectPattern = new RegExp(
  rawRouteErrorRejectPatternSourceFor('error'),
  'g',
)
const catchErrorStartPattern = /catch\s*\(\s*([A-Za-z_$][\w$]*)(?:\s*:\s*(?:unknown|any))?\s*\)\s*\{/g
const rawErrorMessagePropertyPattern =
  /\bmessage\s*:\s*(?:error\s+instanceof\s+Error\s*\?\s*error\s*\.\s*message\s*:\s*String\s*\(\s*error\s*\)|error\s*\.\s*message\b|String\s*\(\s*error\s*\))/g
const rawErrorCodePropertyPattern =
  /\berror\s*:\s*(?:error\s+instanceof\s+Error\s*\?\s*error\s*\.\s*message\s*:\s*String\s*\(\s*error\s*\)|error\s*\.\s*message\b|String\s*\(\s*error\s*\))/g
const rawAuthErrorResponseBypassPattern = rawAuthErrorResponseBypassPatternFor('error')
const rawResponseJsonPattern = /\b[A-Za-z_$][\w$]*(?:\s*\.\s*clone\s*\(\s*\))?\s*\.\s*json\s*\(\s*\)/g
const rawResponseTextPattern = /\b[A-Za-z_$][\w$]*(?:\s*\.\s*clone\s*\(\s*\))?\s*\.\s*text\s*\(\s*\)/g
const routeErrorMessagesBlockPattern = /routeErrorMessages:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n\s*\}/m
const routeErrorMessageKeyPattern = /^\s*([a-z0-9_]+):/gm
const routeErrorResponseCallPattern = /\brouteErrorResponse\(\s*(['"`])([a-z0-9_]+)\1\s*\)/g
const rawRouteCatchMessage = 'route catch ห้ามคืน error.message เป็น message ตรงๆ; ใช้ routeErrorResponse หรือข้อความที่ควบคุมได้.'
const rawRouteCatchErrorCode = 'route catch ห้ามคืน raw error ใน field error; ใช้ machine-readable code ที่ควบคุมได้.'
const rawRouteCatchReturn = 'route catch ห้าม return raw error object ตรงๆ; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.'
const routePromiseRejectAliasMessage = 'route ห้าม alias Promise.reject; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.'
const routePromiseObjectAliasMessage = 'route ห้าม alias Promise object; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.'
const rawResponseJsonMessage = 'ห้าม parse response.json() ตรงใน runtime backend; ให้แยกเป็น read...Payload helper ที่ห่อ JSON พังเป็นข้อความไทยก่อน.'
const rawResponseTextMessage = 'ห้ามอ่าน response.text() จาก provider/Supabase แล้วใช้ตรงใน runtime backend; ต้องผ่าน redactSensitiveText ก่อนนำไป log หรือคืนเป็น diagnostic.'
const allowedRawResponseJsonReaders = [
  'readImageProviderJson',
  'readSupabaseJwksPayload',
  'readSupabaseSignedUrlPayload',
  'readSupabaseUserPayload',
  'readStorageJson',
]

function rawErrorValueExpression(variableName: string) {
  const escaped = escapeRegExp(variableName)
  const rawExpression = rawErrorExpressionPatternFor(variableName)
  const rawMessageAccess = rawErrorMessageAccessPatternFor(variableName)
  return `(?:${escaped}\\s+instanceof\\s+Error\\s*\\?\\s*${rawMessageAccess}\\s*:\\s*String\\s*\\(\\s*${rawExpression}\\s*\\)|${rawMessageAccess}|String\\s*\\(\\s*${rawExpression}\\s*\\))`
}

function rawErrorExpressionPatternFor(variableName: string) {
  const escaped = escapeRegExp(variableName)
  return `(?:${escaped}\\b(?:\\s+(?:as|satisfies)\\s+[^,)]+)?|\\(\\s*${escaped}\\b\\s+(?:as|satisfies)\\s+[^)]+\\))`
}

function rawErrorArgumentPatternFor(variableName: string) {
  return `(?:\\[\\s*)?(?:\\(\\s*)?${rawErrorExpressionPatternFor(variableName)}\\s*(?:\\)\\s*)?(?:\\]\\s*)?(?:,|\\))`
}

function rawErrorArrayElementPatternFor(variableName: string) {
  return `(?:\\(\\s*)?${rawErrorExpressionPatternFor(variableName)}\\s*(?:\\)\\s*)?(?:,|\\])`
}

function rawErrorMessageAccessPatternFor(variableName: string) {
  const escaped = escapeRegExp(variableName)
  return `(?:${escaped}\\b|\\(\\s*${escaped}\\b\\s+(?:as|satisfies)\\s+[^)]+\\))\\s*\\.\\s*message\\b`
}

function rawErrorCodeAccessPatternFor(variableName: string) {
  const escaped = escapeRegExp(variableName)
  return `(?:${escaped}\\b|\\(\\s*${escaped}\\b\\s+(?:as|satisfies)\\s+[^)]+\\))\\s*\\.\\s*code\\b`
}

function rawErrorMessagePropertyPatternFor(variableName: string) {
  return new RegExp(`\\bmessage\\s*:\\s*${rawErrorValueExpression(variableName)}`, 'g')
}

function rawErrorCodePropertyPatternFor(variableName: string) {
  return new RegExp(`\\berror\\s*:\\s*${rawErrorValueExpression(variableName)}`, 'g')
}

function rawRouteErrorReturnPatternFor(variableName: string) {
  return new RegExp(`\\breturn\\s*(?:\\(\\s*)?${rawErrorExpressionPatternFor(variableName)}[ \\t]*(?:\\)[ \\t]*)?(?:;|$)`, 'gm')
}

function rawRouteErrorThrowPatternFor(variableName: string) {
  return new RegExp(`throw\\s*(?:\\(\\s*)?${rawErrorExpressionPatternFor(variableName)}`, 'g')
}

function rawRouteErrorRejectPatternFor(variableName: string) {
  return new RegExp(rawRouteErrorRejectPatternSourceFor(variableName), 'g')
}

function rawRouteErrorRejectPatternSourceFor(variableName: string) {
  const rawExpression = rawErrorExpressionPatternFor(variableName)
  const rawArgument = String.raw`(?:\(\s*)?${rawExpression}`
  const rawArrayElement = rawErrorArrayElementPatternFor(variableName)
  return String.raw`\b(?:return\s+)?${promiseRejectAccessor}\s*(?:\?\.)?\s*\(\s*${rawArgument}|\b(?:return\s+)?${promiseRejectAccessor}\s*(?:\?\.|\.)\s*(?:call|bind)\s*(?:\?\.)?\s*\([\s\S]{0,120}?,\s*${rawArgument}|\b(?:return\s+)?${promiseRejectAccessor}\s*(?:\?\.|\.)\s*bind\s*(?:\?\.)?\s*\([\s\S]{0,120}?\)\s*(?:\?\.)?\s*\(\s*${rawArgument}|\b(?:return\s+)?${promiseRejectAccessor}\s*(?:\?\.|\.)\s*apply\s*(?:\?\.)?\s*\([\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}|\b(?:return\s+)?${reflectPromiseRejectApplyPrefix}[\s\S]{0,120}?${rawArrayElement}|\b(?:return\s+)?${retrievedPromiseRejectValue}\s*(?:\?\.)?\s*\(\s*${rawArgument}|\b(?:return\s+)?${retrievedPromiseRejectValue}\s*(?:\?\.|\.)\s*(?:call|bind)\s*(?:\?\.)?\s*\([\s\S]{0,120}?,\s*${rawArgument}|\b(?:return\s+)?${retrievedPromiseRejectValue}\s*(?:\?\.|\.)\s*bind\s*(?:\?\.)?\s*\([\s\S]{0,120}?\)\s*(?:\?\.)?\s*\(\s*${rawArgument}|\b(?:return\s+)?${retrievedPromiseRejectValue}\s*(?:\?\.|\.)\s*apply\s*(?:\?\.)?\s*\([\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}|\b(?:return\s+)?${reflectRetrievedPromiseRejectApplyPrefix}[\s\S]{0,120}?${rawArrayElement}`
}

function rawPromiseExecutorRejectPatternFor(variableName: string) {
  return rawPromiseExecutorRejectPatternsFor(variableName)[0]
}

function rawPromiseRejectCallbackInvocationPattern(rawExpression: string, rawArrayElement: string) {
  const rawArgument = String.raw`(?:\(\s*)?${rawExpression}`
  const patterns = [
    String.raw`\b\1\s*(?:\?\.)?\s*\(\s*${rawArgument}`,
    String.raw`\b\1\s*(?:\?\.)?\s*\.\s*(?:call|bind)\s*\([\s\S]{0,120}?,\s*${rawArgument}`,
    String.raw`\b\1\s*(?:\?\.)?\s*\.\s*bind\s*\([\s\S]{0,120}?\)\s*\(\s*${rawArgument}`,
    String.raw`\b\1\s*(?:\?\.)?\s*\.\s*apply\s*\([\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}`,
    String.raw`(?:\(\s*)?\b${reflectApplyAccessor}\s*(?:\)\s*)?(?:\?\.)?\s*\(\s*\1\s*,[\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}`,
    String.raw`\b(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)${variableTypeAnnotation}\s*=\s*${reflectApplyAliasValue}[\s\S]{0,120}?\b\2\s*(?:\?\.)?\s*\(\s*\1\s*,[\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}`,
    String.raw`\b(?:const|let|var)\s*\{[^}]*\bapply\b(?!\s*:)[^}]*\}\s*=\s*${reflectObjectAccessor}[\s\S]{0,120}?\bapply\s*(?:\?\.)?\s*\(\s*\1\s*,[\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}`,
    String.raw`\b(?:const|let|var)\s*\{[^}]*\bapply\s*:\s*([A-Za-z_$][\w$]*)[^}]*\}\s*=\s*${reflectObjectAccessor}[\s\S]{0,120}?\b\3\s*(?:\?\.)?\s*\(\s*\1\s*,[\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement}`,
    String.raw`\b(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)${variableTypeAnnotation}\s*=\s*\1(?=\s*(?:[;,\n)]|$|\s+(?:as|satisfies)\b))[\s\S]{0,120}?(?:\b\4\s*(?:\?\.)?\s*\(\s*${rawArgument}|\b\4\s*(?:\?\.)?\s*\.\s*(?:call|bind)\s*\([\s\S]{0,120}?,\s*${rawArgument}|\b\4\s*(?:\?\.)?\s*\.\s*bind\s*\([\s\S]{0,120}?\)\s*\(\s*${rawArgument}|\b\4\s*(?:\?\.)?\s*\.\s*apply\s*\([\s\S]{0,120}?,\s*\[[\s\S]{0,120}?${rawArrayElement})`,
  ]
  return String.raw`(?:${patterns.join('|')})`
}

function rawPromiseExecutorRejectPatternsFor(variableName: string) {
  const rejectParameterPattern = String.raw`([A-Za-z_$][\w$]*)(?:\s*[:?]\s*[^,)]+)?`
  const rawExpression = rawErrorExpressionPatternFor(variableName)
  const rawArrayElement = rawErrorArrayElementPatternFor(variableName)
  const rawRejectInvocation = rawPromiseRejectCallbackInvocationPattern(rawExpression, rawArrayElement)
  return [
    new RegExp(
      String.raw`\bnew\s+Promise(?:\s*<[^>]+>)?\s*\(\s*(?:async\s*)?\([^)]*,\s*${rejectParameterPattern}\s*\)\s*=>[\s\S]{0,240}?${rawRejectInvocation}`,
      'g',
    ),
    new RegExp(
      String.raw`\bnew\s+Promise(?:\s*<[^>]+>)?\s*\(\s*function(?:\s+[A-Za-z_$][\w$]*)?\s*\([^)]*,\s*${rejectParameterPattern}\s*\)[\s\S]{0,240}?${rawRejectInvocation}`,
      'g',
    ),
  ]
}

function rawRouteErrorLogPatternsFor(variableName: string) {
  const rawArgument = rawErrorArgumentPatternFor(variableName)
  const rawArrayElement = rawErrorArrayElementPatternFor(variableName)
  return [
    new RegExp(`${consoleErrorWarnCallPrefix}\\s*${rawArgument}`, 'g'),
    new RegExp(`${consoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawArgument}`, 'g'),
    new RegExp(`${reflectConsoleErrorWarnApplyPrefix}[\\s\\S]*?${rawArrayElement}`, 'g'),
    new RegExp(`${reflectGetConsoleErrorWarnCallPrefix}\\s*${rawArgument}`, 'g'),
    new RegExp(`${reflectGetConsoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawArgument}`, 'g'),
    new RegExp(`${reflectGetConsoleErrorWarnForwardPrefix}\\s*${rawArgument}`, 'g'),
    new RegExp(`${reflectGetConsoleErrorWarnForwardPrefix}[\\s\\S]*?,\\s*${rawArgument}`, 'g'),
    new RegExp(`${descriptorConsoleErrorWarnValueCallPrefix}\\s*${rawArgument}`, 'g'),
    new RegExp(`${descriptorConsoleErrorWarnValueCallPrefix}[\\s\\S]*?,\\s*${rawArgument}`, 'g'),
  ]
}

function rawErrorDetailMessagePatternFor(variableName: string) {
  const escaped = escapeRegExp(variableName)
  return new RegExp(
    `\\bdetail\\s*:\\s*${escaped}\\s+instanceof\\s+Error\\s*\\?\\s*${rawErrorMessageAccessPatternFor(variableName)}`,
    'g',
  )
}

function rawErrorDetailDirectPatternFor(variableName: string) {
  return new RegExp(
    `\\bdetail\\s*:\\s*(?:${rawErrorMessageAccessPatternFor(variableName)}|String\\s*\\(\\s*${rawErrorExpressionPatternFor(variableName)}\\s*\\))`,
    'g',
  )
}

function rawAuthErrorResponseBypassPatternFor(variableName: string) {
  const fieldGap = '\\s*,\\s*(?:[^{}]*?\\s*,\\s*)?'
  return new RegExp(
    `\\berror\\s*:\\s*${rawErrorCodeAccessPatternFor(variableName)}${fieldGap}message\\s*:\\s*${rawErrorMessageAccessPatternFor(variableName)}|\\bmessage\\s*:\\s*${rawErrorMessageAccessPatternFor(variableName)}${fieldGap}error\\s*:\\s*${rawErrorCodeAccessPatternFor(variableName)}`,
    'g',
  )
}

type BackendRouteCall = {
  path: string
  handlerText: string
  index: number
}

const patterns = [
  {
    pattern: consoleObjectAliasPattern,
    message:
      'backend source ห้าม alias console object; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: consoleObjectContainerAliasPattern,
    message:
      'backend source ห้าม alias console object; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: consoleObjectPrototypeMutationContainerAliasPattern,
    message:
      'backend source ห้าม alias console object; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: consoleErrorWarnAliasPattern,
    message:
      'backend source ห้าม alias console.error/console.warn; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: consoleErrorWarnContainerAliasPattern,
    message:
      'backend source ห้าม alias console.error/console.warn; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: consoleErrorWarnPrototypeMutationContainerAliasPattern,
    message:
      'backend source ห้าม alias console.error/console.warn; ให้เรียก safe summary helper ตรงๆ เพื่อให้ audit ตาม raw error object ได้',
  },
  {
    pattern: retrievalMethodAliasPattern,
    message:
      'backend source ห้าม alias Reflect.get/Object.getOwnPropertyDescriptor; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม retrieved console/Promise targets ได้',
  },
  {
    pattern: retrievalMethodContainerAliasPattern,
    message:
      'backend source ห้าม alias Reflect.get/Object.getOwnPropertyDescriptor; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม retrieved console/Promise targets ได้',
  },
  {
    pattern: reflectObjectAliasPattern,
    message:
      'backend source ห้าม alias Reflect object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม reflected console/Promise targets ได้',
  },
  {
    pattern: reflectObjectContainerAliasPattern,
    message:
      'backend source ห้าม alias Reflect object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม reflected console/Promise targets ได้',
  },
  {
    pattern: reflectObjectPrototypeMutationContainerAliasPattern,
    message:
      'backend source ห้าม alias Reflect object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม reflected console/Promise targets ได้',
  },
  {
    pattern: objectObjectAliasPattern,
    message:
      'backend source ห้าม alias Object object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม descriptor console/Promise targets ได้',
  },
  {
    pattern: objectObjectContainerAliasPattern,
    message:
      'backend source ห้าม alias Object object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม descriptor console/Promise targets ได้',
  },
  {
    pattern: objectObjectPrototypeMutationContainerAliasPattern,
    message:
      'backend source ห้าม alias Object object; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม descriptor console/Promise targets ได้',
  },
  {
    pattern: reflectApplyAliasPattern,
    message:
      'backend source ห้าม alias Reflect.apply; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม forwarded console/Promise targets ได้',
  },
  {
    pattern: reflectApplyContainerAliasPattern,
    message:
      'backend source ห้าม alias Reflect.apply; ให้เรียกเมธอดตรงๆ เพื่อให้ audit ตาม forwarded console/Promise targets ได้',
  },
  {
    pattern: /\.\s*\$queryRawUnsafe\s*\(/g,
    message: 'ห้ามใช้ Prisma $queryRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $queryRaw พร้อม parameters.',
  },
  {
    pattern: /\.\s*\$executeRawUnsafe\s*\(/g,
    message: 'ห้ามใช้ Prisma $executeRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $executeRaw พร้อม parameters.',
  },
  {
    pattern: /\bPrisma\s*\.\s*raw\s*\(/g,
    message: 'ห้ามใช้ Prisma.raw เพราะอาจข้าม parameterization.',
  },
  {
    pattern: /\.\s*\$queryRaw(?:<[^>]+>)?\s*\(/g,
    message: 'ห้ามใช้ Prisma $queryRaw แบบ function call; ให้ใช้ tagged template parameterization.',
  },
  {
    pattern: /\.\s*\$executeRaw(?:<[^>]+>)?\s*\(/g,
    message: 'ห้ามใช้ Prisma $executeRaw แบบ function call; ให้ใช้ tagged template parameterization.',
  },
  {
    pattern: new RegExp(
      `${consoleErrorWarnCallPrefix}[\\s\\S]*?providerFailure[\\s\\S]*?,\\s*${rawErrorExpressionPatternFor('error')}[\\s\\S]*?\\)`,
      'g',
    ),
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: new RegExp(
      `${reflectConsoleErrorWarnApplyPrefix}[\\s\\S]*?providerFailure[\\s\\S]*?,\\s*${rawErrorArrayElementPatternFor('error')}`,
      'g',
    ),
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: new RegExp(
      `${reflectGetConsoleErrorWarnCallPrefix}[\\s\\S]*?providerFailure[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`,
      'g',
    ),
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: new RegExp(
      `${reflectGetConsoleErrorWarnForwardPrefix}[\\s\\S]*?providerFailure[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`,
      'g',
    ),
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: new RegExp(
      `${descriptorConsoleErrorWarnValueCallPrefix}[\\s\\S]*?providerFailure[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`,
      'g',
    ),
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: new RegExp(
      `${consoleErrorWarnCallPrefix}\\s*${rawErrorArgumentPatternFor('error')}`,
      'g',
    ),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${consoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${reflectConsoleErrorWarnApplyPrefix}[\\s\\S]*?${rawErrorArrayElementPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${reflectGetConsoleErrorWarnCallPrefix}\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${reflectGetConsoleErrorWarnCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${reflectGetConsoleErrorWarnForwardPrefix}\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${reflectGetConsoleErrorWarnForwardPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${descriptorConsoleErrorWarnValueCallPrefix}\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: new RegExp(`${descriptorConsoleErrorWarnValueCallPrefix}[\\s\\S]*?,\\s*${rawErrorArgumentPatternFor('error')}`, 'g'),
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: rawAuthErrorResponseBypassPattern,
    message: 'ห้ามประกอบ AuthError response จาก error.code/error.message ตรงๆ; ใช้ authErrorResponse(error) เพื่อคุมข้อความ public.',
  },
  {
    pattern: rawErrorDetailMessagePatternFor('error'),
    message: 'route response ห้ามส่ง raw error.message ใน detail; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.',
  },
  {
    pattern: rawErrorDetailDirectPatternFor('error'),
    message: 'route response ห้ามส่ง raw error detail ตรงๆ; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.',
  },
]

function findMatchingBrace(content: string, openingBraceIndex: number) {
  let depth = 0
  for (let index = openingBraceIndex; index < content.length; index += 1) {
    const char = content[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return content.length
}

function findMatchingParen(content: string, openingParenIndex: number) {
  let depth = 0
  let inString: string | null = null
  let escaped = false

  for (let index = openingParenIndex; index < content.length; index += 1) {
    const char = content[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === inString) {
        inString = null
      }
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char
    } else if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return content.length
}

function stringLiteralText(expression: ts.Expression | undefined) {
  if (!expression) return null
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text
  return null
}

export function collectBackendRouteCalls(file: string, content: string) {
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const routes: BackendRouteCall[] = []

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text.toLowerCase()
      const path = routeMethods.has(methodName) ? stringLiteralText(node.arguments[0]) : null
      if (path?.startsWith('/')) {
        routes.push({
          path,
          handlerText: node.arguments
            .slice(1)
            .map((argument) => argument.getText(sourceFile))
            .join('\n'),
          index: node.expression.name.getStart(sourceFile),
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return routes.sort((a, b) => a.index - b.index)
}

function isAdminRoute(path: string) {
  return path === '/admin' || path.startsWith('/admin/')
}

function hasUuidIdParam(path: string) {
  return /(?:^|\/):id(?:\/|$)/.test(path)
}

function isControlledAuthErrorMessage(
  catchBlock: string,
  messageIndex: number,
  messageSource: string,
  variableName: string,
) {
  const escaped = escapeRegExp(variableName)
  if (!new RegExp(`\\bmessage\\s*:\\s*${escaped}\\s*\\.\\s*message\\b`).test(messageSource)) return false

  const beforeMessage = catchBlock.slice(0, messageIndex)
  const authCheckPattern = new RegExp(`${escaped}\\s+instanceof\\s+AuthError`, 'g')
  let authCheckIndex = -1
  for (const authMatch of beforeMessage.matchAll(authCheckPattern)) {
    authCheckIndex = authMatch.index ?? -1
  }
  if (authCheckIndex < 0) return false

  const authBlockStart = catchBlock.indexOf('{', authCheckIndex)
  if (authBlockStart < 0 || authBlockStart > messageIndex) return false

  return messageIndex < findMatchingBrace(catchBlock, authBlockStart)
}

function isInsideAllowedRawResponseJsonReader(content: string, index: number) {
  for (const functionName of allowedRawResponseJsonReaders) {
    const functionPattern = new RegExp(`(?:export\\s+)?async\\s+function\\s+${functionName}\\s*\\(`, 'g')
    for (const match of content.matchAll(functionPattern)) {
      const openingBraceIndex = content.indexOf('{', match.index ?? 0)
      if (openingBraceIndex < 0 || openingBraceIndex > index) continue
      const closingBraceIndex = findMatchingBrace(content, openingBraceIndex)
      if (index > openingBraceIndex && index < closingBraceIndex) return true
    }
  }

  return false
}

function isInsideRedactedTextCall(content: string, index: number) {
  for (const match of content.matchAll(/\bredactSensitiveText\s*\(/g)) {
    const openingParenIndex = content.indexOf('(', match.index ?? 0)
    if (openingParenIndex < 0 || openingParenIndex > index) continue
    const closingParenIndex = findMatchingParen(content, openingParenIndex)
    if (index > openingParenIndex && index < closingParenIndex) return true
  }

  return false
}

function collectRawRouteCatchMessageFindings(file: string, content: string) {
  const findings: BackendSecurityFinding[] = []
  for (const catchMatch of content.matchAll(catchErrorStartPattern)) {
    const variableName = catchMatch[1] ?? 'error'
    const openingBraceIndex = content.indexOf('{', catchMatch.index ?? 0)
    if (openingBraceIndex < 0) continue

    const closingBraceIndex = findMatchingBrace(content, openingBraceIndex)
    const catchBlock = content.slice(openingBraceIndex + 1, closingBraceIndex)
    for (const messageMatch of catchBlock.matchAll(rawErrorMessagePropertyPatternFor(variableName))) {
      const blockMessageIndex = messageMatch.index ?? 0
      if (isControlledAuthErrorMessage(catchBlock, blockMessageIndex, messageMatch[0] ?? '', variableName)) continue

      findings.push({
        file,
        line: lineFor(content, openingBraceIndex + 1 + blockMessageIndex),
        message: rawRouteCatchMessage,
      })
    }

    for (const errorMatch of catchBlock.matchAll(rawErrorCodePropertyPatternFor(variableName))) {
      const blockErrorIndex = errorMatch.index ?? 0
      findings.push({
        file,
        line: lineFor(content, openingBraceIndex + 1 + blockErrorIndex),
        message: rawRouteCatchErrorCode,
      })
    }

    for (const returnMatch of catchBlock.matchAll(rawRouteErrorReturnPatternFor(variableName))) {
      const blockReturnIndex = returnMatch.index ?? 0
      findings.push({
        file,
        line: lineFor(content, openingBraceIndex + 1 + blockReturnIndex),
        message: rawRouteCatchReturn,
      })
    }

    for (const rejectMatch of catchBlock.matchAll(rawRouteErrorRejectPatternFor(variableName))) {
      const blockRejectIndex = rejectMatch.index ?? 0
      findings.push({
        file,
        line: lineFor(content, openingBraceIndex + 1 + blockRejectIndex),
        message: rawRouteCatchReturn,
      })
    }

    for (const pattern of rawPromiseExecutorRejectPatternsFor(variableName)) {
      for (const rejectMatch of catchBlock.matchAll(pattern)) {
        const blockRejectIndex = rejectMatch.index ?? 0
        findings.push({
          file,
          line: lineFor(content, openingBraceIndex + 1 + blockRejectIndex),
          message: rawRouteCatchReturn,
        })
      }
    }

    if (variableName !== 'error') {
      for (const detailMatch of catchBlock.matchAll(rawErrorDetailMessagePatternFor(variableName))) {
        const blockDetailIndex = detailMatch.index ?? 0
        findings.push({
          file,
          line: lineFor(content, openingBraceIndex + 1 + blockDetailIndex),
          message: 'route response เธซเนเธฒเธกเธชเนเธ raw error.message เนเธ detail; เนเธเน safeRouteErrorSummary เธซเธฃเธทเธญเธเนเธญเธเธงเธฒเธกเธ—เธตเนเธเธงเธเธเธธเธกเนเธ”เน.',
        })
      }

      for (const detailMatch of catchBlock.matchAll(rawErrorDetailDirectPatternFor(variableName))) {
        const blockDetailIndex = detailMatch.index ?? 0
        findings.push({
          file,
          line: lineFor(content, openingBraceIndex + 1 + blockDetailIndex),
          message: 'route response เธซเนเธฒเธกเธชเนเธ raw error detail เธ•เธฃเธเน; เนเธเน safeRouteErrorSummary เธซเธฃเธทเธญเธเนเธญเธเธงเธฒเธกเธ—เธตเนเธเธงเธเธเธธเธกเนเธ”เน.',
        })
      }

      for (const authMatch of catchBlock.matchAll(rawAuthErrorResponseBypassPatternFor(variableName))) {
        const blockAuthIndex = authMatch.index ?? 0
        findings.push({
          file,
          line: lineFor(content, openingBraceIndex + 1 + blockAuthIndex),
          message: 'เธซเนเธฒเธกเธเธฃเธฐเธเธญเธ AuthError response เธเธฒเธ error.code/error.message เธ•เธฃเธเน; เนเธเน authErrorResponse(error) เน€เธเธทเนเธญเธเธธเธกเธเนเธญเธเธงเธฒเธก public.',
        })
      }

      for (const logPattern of rawRouteErrorLogPatternsFor(variableName)) {
        for (const logMatch of catchBlock.matchAll(logPattern)) {
          const blockLogIndex = logMatch.index ?? 0
          findings.push({
            file,
            line: lineFor(content, openingBraceIndex + 1 + blockLogIndex),
            message: 'route log raw error object เธ•เธฃเธเน เนเธกเนเนเธ”เน; เนเธเน safeRouteErrorSummary เน€เธเธทเนเธญเธเธฑเธเธเนเธญเธกเธนเธฅเธฅเธฑเธเธซเธฅเธธเธ” log.',
          })
        }
      }

      for (const throwMatch of catchBlock.matchAll(rawRouteErrorThrowPatternFor(variableName))) {
        const blockThrowIndex = throwMatch.index ?? 0
        findings.push({
          file,
          line: lineFor(content, openingBraceIndex + 1 + blockThrowIndex),
          message: 'route throw raw error object เธ•เธฃเธเน เนเธกเนเนเธ”เน; เธเธทเธ routeErrorResponse เธซเธฃเธทเธญ response เธ—เธตเนเธเธงเธเธเธธเธกเธเนเธญเธเธงเธฒเธกเนเธ”เน.',
        })
      }
    }
  }
  return findings
}

export function collectBackendSecurityFindingsFromSource(file: string, content: string): BackendSecurityFinding[] {
  const findings: BackendSecurityFinding[] = []

  for (const item of patterns) {
    for (const match of content.matchAll(item.pattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: item.message,
      })
    }
  }

  for (const match of content.matchAll(rawResponseJsonPattern)) {
    if (isInsideAllowedRawResponseJsonReader(content, match.index ?? 0)) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawResponseJsonMessage,
    })
  }

  for (const match of content.matchAll(rawResponseTextPattern)) {
    if (isInsideRedactedTextCall(content, match.index ?? 0)) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawResponseTextMessage,
    })
  }

  const routeCalls = collectBackendRouteCalls(file, content)

  for (const route of routeCalls) {
    if (!isAdminRoute(route.path)) continue
    if (route.handlerText.includes('requireAdminApiKey')) continue
    findings.push({
      file,
      line: lineFor(content, route.index),
      message: 'route ผู้ดูแลยังไม่มี requireAdminApiKey guard ใน block ของ handler.',
    })
  }

  for (const route of routeCalls) {
    if (!hasUuidIdParam(route.path)) continue
    if (route.handlerText.includes('rejectInvalidUuid')) continue
    findings.push({
      file,
      line: lineFor(content, route.index),
      message: 'route ที่มี /:id ยังไม่มี rejectInvalidUuid guard ก่อนเข้าถึงข้อมูล.',
    })
  }

  if (file.endsWith('.routes.ts')) {
    for (const match of content.matchAll(rawRouteErrorLogPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.',
      })
    }

    for (const match of content.matchAll(rawRouteErrorThrowPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route throw raw error object ตรงๆ ไม่ได้; คืน routeErrorResponse หรือ response ที่ควบคุมข้อความได้.',
      })
    }

    for (const match of content.matchAll(rawRouteErrorReturnPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: rawRouteCatchReturn,
      })
    }

    for (const match of content.matchAll(rawRouteErrorRejectPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: rawRouteCatchReturn,
      })
    }

    for (const pattern of rawPromiseExecutorRejectPatternsFor('error')) {
      for (const match of content.matchAll(pattern)) {
        findings.push({
          file,
          line: lineFor(content, match.index ?? 0),
          message: rawRouteCatchReturn,
        })
      }
    }

    for (const match of content.matchAll(promiseRejectAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseRejectAliasMessage,
      })
    }

    for (const match of content.matchAll(promiseRejectContainerAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseRejectAliasMessage,
      })
    }
    for (const match of content.matchAll(promiseRejectPrototypeMutationContainerAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseRejectAliasMessage,
      })
    }

    for (const match of content.matchAll(promiseObjectAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseObjectAliasMessage,
      })
    }

    for (const match of content.matchAll(promiseObjectContainerAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseObjectAliasMessage,
      })
    }
    for (const match of content.matchAll(promiseObjectPrototypeMutationContainerAliasPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: routePromiseObjectAliasMessage,
      })
    }

    findings.push(...collectRawRouteCatchMessageFindings(file, content))

    for (const match of content.matchAll(rawRouteErrorResponsePattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route error response ยังไม่มี message แบบ Thai-first; ใช้ routeErrorResponse หรือใส่ message.',
      })
    }
  }

  return findings
}

export function collectKnownRouteErrorMessages(routeGuardsContent: string) {
  const block = routeGuardsContent.match(routeErrorMessagesBlockPattern)?.[1] ?? ''
  return new Set([...block.matchAll(routeErrorMessageKeyPattern)].map((match) => match[1] ?? '').filter(Boolean))
}

export function collectRouteErrorResponseCodes(content: string) {
  return [...content.matchAll(routeErrorResponseCallPattern)].map((match) => ({
    code: match[2] ?? '',
    index: match.index ?? 0,
  })).filter((item) => item.code)
}

export async function collectBackendSecurityFindings() {
  const files = (await Promise.all(scannedTargets.map((target) => collectSourceFiles(join(root, target))))).flat()
  const findings: BackendSecurityFinding[] = []
  const routeGuardsPath = join(root, 'apps/backend/src/route-guards.ts')
  const routeGuardsContent = await readFile(routeGuardsPath, 'utf8')
  const knownRouteErrors = collectKnownRouteErrorMessages(routeGuardsContent)

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const relativeFile = relative(root, file).replaceAll('\\', '/')
    findings.push(...collectBackendSecurityFindingsFromSource(relativeFile, content))
    if (!relativeFile.endsWith('route-guards.ts')) {
      for (const call of collectRouteErrorResponseCodes(content)) {
        if (knownRouteErrors.has(call.code)) continue
        findings.push({
          file: relativeFile,
          line: lineFor(content, call.index),
          message: `routeErrorResponse code "${call.code}" ยังไม่มีใน routeErrorMessages.`,
        })
      }
    }
  }

  return findings
}

export async function runBackendSecurityAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const findings = await collectBackendSecurityFindings()

  if (findings.length > 0) {
    writeError('ตรวจ security ระบบหลังบ้านไม่ผ่าน:')
    for (const finding of findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine('ผ่าน - ตรวจ security ระบบหลังบ้านผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runBackendSecurityAudit())
