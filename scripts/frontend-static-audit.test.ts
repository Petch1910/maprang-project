import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  isTrustedMessageOrigin,
  normalizeTrustedMessageOrigin,
  postMessageToTrustedOrigin,
} from '../apps/frontend/src/lib/crossWindowMessaging'
import { characterShareUrl } from '../apps/frontend/src/lib/shareUrl'
import {
  auditBrowserEventListenerCleanup,
  auditButtonsWithAst,
  auditDisabledControlsWithAst,
  auditDirectLocationOriginUsage,
  auditFrontendSourceFile,
  auditLinksWithAst,
  auditRawFrontendFetchUsage,
  auditRawUiErrorThrows,
  auditReferencedFrontendModules,
  auditRawResponseTextParsing,
  auditSuspiciousPatterns,
  auditUnmountedFrontendComponents,
  auditUnmountedFrontendPages,
  collectFrontendStaticFindings,
  lineFor,
  runFrontendStaticAudit,
} from './frontend-static-audit'

const englishUiFinding = 'พบ label ภาษาอังกฤษใน UI ที่ควรเป็น Thai-first'
const creatorMixedFinding = 'พบข้อความ Creator Studio ปนอังกฤษที่ควรเป็น Thai-first'
const adminHealthMixedFinding = 'พบข้อความ Admin Health ปนอังกฤษที่ควรเป็น Thai-first'
const promptToolingMixedFinding = 'พบข้อความ prompt/admin tooling ปนอังกฤษที่ควรเป็น Thai-first'
const mixedUiFinding = 'พบข้อความ UI ปนอังกฤษที่ควรเป็น Thai-first'
const profileHelperMixedFinding = 'พบข้อความ profile/tag helper ปนอังกฤษที่ควรเป็น Thai-first'
const knowledgePersonaMixedFinding = 'พบข้อความคลังความรู้หรือตัวตนผู้เล่นปนอังกฤษที่ควรเป็น Thai-first'

describe('frontend static audit', () => {
  test('builds character share URLs through the shared helper', () => {
    expect(characterShareUrl('abc-123', 'https://app.example.com')).toBe('https://app.example.com/characters/abc-123')
    expect(characterShareUrl('id with space', 'https://app.example.com/')).toBe(
      'https://app.example.com/characters/id%20with%20space',
    )
  })

  test('reports buttons without explicit type and icon-only labels', () => {
    const findings = auditButtonsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button onClick={save}>Save</button>
              <button type="button"><Icon /></button>
              <button type="button" aria-label="Refresh"><Icon /></button>
              <button type="button">Cancel</button>
            </>
          )
        }
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('ปุ่มไม่มี type ชัดเจน'),
      expect.stringContaining('ปุ่มไอคอนล้วนไม่มี aria-label หรือ title'),
    ])
  })

  test('reports disabled controls without a user-facing reason', () => {
    const findings = auditDisabledControlsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button type="button" disabled={isSaving}>Save</button>
              <input disabled />
              <button type="button" disabled={isSaving} title={saveReason || 'บันทึก'}>Safe</button>
              <input disabled={isLoading} aria-label="โหลดข้อมูลก่อนแก้ไข" />
              <textarea disabled={false} />
            </>
          )
        }
      `,
      'DisabledFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
    ])
  })

  test('reports aria-disabled controls without a user-facing reason', () => {
    const findings = auditDisabledControlsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button type="button" aria-disabled={isSaving}>Save</button>
              <a href="/wallet" aria-disabled={isLoading}>Wallet</a>
              <Link to="/chat" aria-disabled>Chat</Link>
              <input aria-disabled={isLocked} />
              <label aria-disabled={isUploading}>Upload</label>
              <textarea aria-disabled={isLocked} title={lockReason || 'กำลังล็อกช่องนี้'} />
              <NavLink to="/events" aria-disabled="false">Events</NavLink>
              <select aria-disabled="false"><option>Open</option></select>
              <button type="button" aria-disabled={false}>Open</button>
              <a href="/safe" aria-disabled={isLoading} title={loadReason || 'โหลดข้อมูลก่อน'}>Safe</a>
              <button type="button" disabled={isSaving} aria-disabled={isSaving}>Native disabled already covered</button>
            </>
          )
        }
      `,
      'AriaDisabledFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
    ])
  })

  test('reports unsafe new-tab links without opener protection', () => {
    const findings = auditLinksWithAst(
      `
        export function Fixture() {
          return (
            <>
              <a href="https://example.com" target="_blank">External</a>
              <a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe</a>
              <a href="https://example.com" target="_self">Same tab</a>
            </>
          )
        }
      `,
      'LinkFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('ลิงก์ target="_blank" ต้องมี rel="noopener noreferrer"'),
    ])
  })

  test('reports unsafe React Router new-tab links without opener protection', () => {
    const findings = auditLinksWithAst(
      `
        export function Fixture() {
          return (
            <>
              <Link to="/profile" target="_blank">Unsafe router link</Link>
              <NavLink to="/profile" target="_blank" rel="noopener noreferrer">Safe router link</NavLink>
            </>
          )
        }
      `,
      'RouterLinkFixture.tsx',
    )

    expect(findings).toHaveLength(1)
    expect(findings[0]?.message).toContain('target="_blank"')
    expect(findings[0]?.message).toContain('rel="noopener noreferrer"')
  })

  test('reports browser event listeners without cleanup', () => {
    const findings = auditBrowserEventListenerCleanup(
      `
        export function Fixture() {
          useEffect(() => {
            window.addEventListener('resize', closeOnResize)
            document . addEventListener("keydown", closeOnEscape)
            globalThis.addEventListener('click', closeOnClick)
            window . addEventListener('scroll', closeOnScroll)

            return () => {
              window.removeEventListener('resize', closeOnResize)
              document . removeEventListener("keydown", closeOnEscape)
              globalThis.removeEventListener('click', closeOnClick)
            }
          }, [])
        }
      `,
      'ListenerFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('frontend source ที่เพิ่ม browser event listener ต้องมี removeEventListener คู่กันในไฟล์เดียวกัน'),
    ])
    expect(findings[0]?.message).toContain('scroll')
    expect(findings[0]?.message).toContain('closeOnScroll')
  })

  test('reports direct location origin usage outside share URL helper', () => {
    expect(
      auditDirectLocationOriginUsage(
        `
          const url = \`\${window.location.origin}/characters/1\`
          const spaced = globalThis . location . origin
          const bare = location . origin
        `,
        'apps/frontend/src/pages/ShareFixture.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'ห้ามอ่าน window.location.origin ตรงใน frontend source; ให้ใช้ shareUrl helper กลางเพื่อคุมลิงก์แชร์ให้เสถียรและทดสอบได้.',
      'ห้ามอ่าน window.location.origin ตรงใน frontend source; ให้ใช้ shareUrl helper กลางเพื่อคุมลิงก์แชร์ให้เสถียรและทดสอบได้.',
      'ห้ามอ่าน window.location.origin ตรงใน frontend source; ให้ใช้ shareUrl helper กลางเพื่อคุมลิงก์แชร์ให้เสถียรและทดสอบได้.',
    ])

    expect(
      auditDirectLocationOriginUsage('const origin = window.location.origin', 'apps/frontend/src/lib/shareUrl.ts'),
    ).toEqual([])
  })

  test('routes cross-window messages through trusted origin helpers', () => {
    expect(normalizeTrustedMessageOrigin('https://app.example.com')).toBe('https://app.example.com')
    expect(normalizeTrustedMessageOrigin('https://app.example.com/')).toBe('https://app.example.com')
    expect(normalizeTrustedMessageOrigin('http://app.example.com')).toBeNull()
    expect(normalizeTrustedMessageOrigin('https://user:pass@app.example.com')).toBeNull()
    expect(normalizeTrustedMessageOrigin('https://app.example.com/path')).toBeNull()
    expect(isTrustedMessageOrigin('https://app.example.com', ['https://app.example.com/'])).toBe(true)
    expect(isTrustedMessageOrigin('https://evil.example.com', ['https://app.example.com'])).toBe(false)

    const calls: Array<{ message: unknown; origin: string }> = []
    const targetWindow = {
      postMessage(message: unknown, origin: string) {
        calls.push({ message, origin })
      },
    }

    expect(postMessageToTrustedOrigin(targetWindow, { type: 'ping' }, 'https://app.example.com/')).toBe(true)
    expect(postMessageToTrustedOrigin(targetWindow, { type: 'bad' }, '*')).toBe(false)
    expect(calls).toEqual([{ message: { type: 'ping' }, origin: 'https://app.example.com' }])
  })

  test('allows message event listeners only inside cross-window messaging helper', () => {
    expect(
      auditFrontendSourceFile(
        `
          function install(handler) {
            window.addEventListener('message', handler)
            return () => window.removeEventListener('message', handler)
          }
        `,
        'apps/frontend/src/lib/crossWindowMessaging.ts',
      ),
    ).toEqual([])

    expect(
      auditFrontendSourceFile(
        `
          function install(handler) {
            window.addEventListener('message', handler)
            return () => window.removeEventListener('message', handler)
          }
        `,
        'apps/frontend/src/components/MessageFixture.tsx',
      ).map((finding) => finding.message),
    ).toContain('ห้ามรับ message event ตรงใน frontend source; ให้ใช้ crossWindowMessaging helper ที่ตรวจ event.origin ชัดเจน')
  })

  test('reports placeholder links, empty handlers, and not implemented errors', () => {
    const findings = auditSuspiciousPatterns(
      `
        <a href="#">Placeholder</a>
        <a href = "#">Spaced placeholder</a>
        <a href={"#"}>Expression placeholder</a>
        <a href={\`#\`}>Template placeholder</a>
        <NavLink to={"#"}>Placeholder</NavLink>
        <NavLink to = {'#'}>Spaced Router placeholder</NavLink>
        <NavLink to={\`#\`}>Template Router placeholder</NavLink>
        <button type="button" onClick={() => {}}>No-op</button>
        <button type="button" onClick = {() => {}}>Spaced no-op</button>
        <button type="button" onClick={async () => {}}>Async no-op</button>
        <button type="button" onClick = {async () => {}}>Spaced async no-op</button>
        <button type="button" onClick={() => undefined}>Undefined no-op</button>
        <button type="button" onClick = {() => undefined}>Spaced undefined no-op</button>
        <form onSubmit={() => {}}>No-op submit</form>
        <form onSubmit = {() => {}}>Spaced no-op submit</form>
        <form onSubmit={async () => {}}>Async no-op submit</form>
        <form onSubmit = {async () => {}}>Spaced async no-op submit</form>
        <form onSubmit={() => undefined}>Undefined no-op submit</form>
        <form onSubmit = {() => undefined}>Spaced undefined no-op submit</form>
        throw new Error('not implemented')
        throw new Error (\`not implemented\`)
        setNote(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ')
        setNote ( error instanceof Error ? error . message : 'เข้าสู่ระบบไม่สำเร็จ' )
        state.error = action.error.message
        state . error = action . error . message
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'fallback'
        const payloadError =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'fallback'
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'ลิงก์ใช้ href="#" เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href="#" เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick async ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick async ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick คืน undefined',
      'ปุ่มหรือลิงก์มี onClick คืน undefined',
      'ฟอร์มมี onSubmit ว่างเปล่า',
      'ฟอร์มมี onSubmit ว่างเปล่า',
      'ฟอร์มมี onSubmit async ว่างเปล่า',
      'ฟอร์มมี onSubmit async ว่างเปล่า',
      'ฟอร์มมี onSubmit คืน undefined',
      'ฟอร์มมี onSubmit คืน undefined',
      'frontend source ยังโยน not implemented',
      'frontend source ยังโยน not implemented',
      'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
      'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
      'พบข้อความ error ดิบจาก Redux async ที่อาจแสดงให้ผู้ใช้เห็น',
      'พบข้อความ error ดิบจาก Redux async ที่อาจแสดงให้ผู้ใช้เห็น',
      'ApiError ต้องใช้ payload.message ก่อน payload.error',
      'ApiError ห้ามแสดง payload.error เป็น fallback ให้ผู้ใช้',
    ])
  })

  test('reports raw auth error classifier regressions', () => {
    expect(
      auditSuspiciousPatterns(
        `
          const rawAuthMessage = error.message.toLowerCase()
          const rawAuthMessageSpaced = error . message . toLowerCase()
          const rawStringMessage = String(error).toLowerCase()
          const rawStringMessageSpaced = String ( error ) . toLowerCase()
          const rawRegexMessage = /admin_unauthorized|forbidden/i.test(error.message)
          const rawRegexMessageSpaced = /admin_unauthorized|forbidden/i.test(error . message)
          const rawMatchMessage = error.message.match(/forbidden/i)
          const rawMatchMessageSpaced = error . message . match(/forbidden/i)
        `,
        'AuthFixture.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
    ])
  })

  test('reports alternate catch-variable raw frontend error classifiers and visible messages', () => {
    expect(
      auditSuspiciousPatterns(
        `
          try {
            await signIn()
          } catch (problem) {
            const rawAuthMessage = problem.message.toLowerCase()
            const rawStringMessage = String(problem).toLowerCase()
            const rawAssertedAuthMessage = (problem as Error).message.toLowerCase()
            const rawAssertedStringMessage = String(problem as Error).toLowerCase()
            const rawRegexMessage = /admin_unauthorized|forbidden/i.test(problem.message)
            const rawMatchMessage = problem.message.match(/forbidden/i)
            const rawAssertedRegexMessage = /admin_unauthorized|forbidden/i.test((problem as Error).message)
            const rawAssertedMatchMessage = (problem as Error).message.match(/forbidden/i)
            setNotice(problem instanceof Error ? problem.message : 'เข้าสู่ระบบไม่สำเร็จ')
            setNotice(problem instanceof Error ? (problem as Error).message : 'เข้าสู่ระบบไม่สำเร็จ')
            setNotice(safeBrowserErrorSummary(problem))
          }
        `,
        'apps/frontend/src/pages/AuthFixturePage.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
      'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
    ])
  })

  test('reports raw UI error throws in components and pages', () => {
    expect(
      auditRawUiErrorThrows(
        `
          const { reject: typedReject }: PromiseConstructor = Promise
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          const globalRejectNow = globalThis.Promise.reject
          const { reject: windowReject } = window.Promise
          const bracketRejectNow = globalThis['Promise']['reject']
          const parenthesizedRejectNow = (window).Promise.reject
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(4)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            setNote('ไม่สำเร็จ')
            throw error
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ).map((finding) => finding.message),
    ).toEqual(['หน้า UI ห้าม throw raw error object จาก component/page; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.'])

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            throw (error)
          }
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            return Promise.reject(error)
            return Promise?.reject?.(error)
            return Promise['reject'](error)
            return Promise?.['reject']?.(error as Error)
            return window.Promise.reject(error)
            return globalThis.Promise?.['reject']?.(error as Error)
            return (window).Promise.reject(error)
            return globalThis['Promise']['reject'](error)
            return Reflect.get(window, 'Promise').reject(error)
            return (window).Reflect.get(window, 'Promise').reject(error)
            return Reflect.get?.(window, 'Promise').reject(error)
            return (Reflect.get)?.(window, 'Promise').reject(error)
            return Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value.reject(error)
            return (globalThis).Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value.reject(error)
            return Object.getOwnPropertyDescriptor?.(globalThis, 'Promise')?.value.reject(error)
            return (Object.getOwnPropertyDescriptor)?.(globalThis, 'Promise')?.value.reject(error)
            return Reflect.get.apply(Reflect, [window, 'Promise']).reject(error)
            return Reflect.get.bind(Reflect)(window, 'Promise').reject(error)
            return Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value.reject(error)
            return Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value.reject(error)
            return (Reflect.get.apply)(Reflect, [window, 'Promise']).reject(error)
            return (Reflect.get.bind(Reflect))(window, 'Promise').reject(error)
            return (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value.reject(error)
            return (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value.reject(error)
            return (Reflect.get.apply)?.(Reflect, [window, 'Promise']).reject(error)
            return (Reflect.get.bind(Reflect))?.(window, 'Promise').reject(error)
            return (Object.getOwnPropertyDescriptor.apply)?.(Object, [globalThis, 'Promise'])?.value.reject(error)
            return (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value.reject(error)
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(28)

    for (const rejectedExpression of [
      'return Promise.reject.call(Promise, error)',
      'return Promise.reject.apply(Promise, [error])',
      'return Promise.reject.bind(Promise)(error)',
      'return window.Promise.reject.call(window.Promise, error)',
      "return globalThis['Promise']['reject'].call(globalThis['Promise'], error)",
      'return Reflect.apply(Promise.reject, Promise, [error])',
      'return Reflect.apply?.(Promise.reject, Promise, [error])',
      'return globalThis.Reflect.apply(Promise.reject, Promise, [error])',
      'return window.Reflect["apply"](Promise.reject, Promise, [error])',
      'return window.Reflect["apply"]?.(Promise.reject, Promise, [error])',
      'return (Reflect.apply)(Promise.reject, Promise, [error])',
      'return (Reflect.apply)?.(Promise.reject, Promise, [error])',
      'return (window.Reflect["apply"])(Promise.reject, Promise, [error])',
      'return Reflect.apply(window.Promise.reject, window.Promise, [error])',
      "return Reflect.apply(globalThis['Promise']['reject'], globalThis['Promise'], [error])",
      "return Reflect.apply(Reflect.get(window, 'Promise').reject, Reflect.get(window, 'Promise'), [error])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value['reject'], Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value, [error])",
      "return Reflect.apply(Reflect.get.apply(Reflect, [window, 'Promise']).reject, Reflect.get.apply(Reflect, [window, 'Promise']), [error])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value['reject'], Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value, [error])",
      "return Reflect.apply((Reflect.get.apply)(Reflect, [window, 'Promise']).reject, (Reflect.get.apply)(Reflect, [window, 'Promise']), [error])",
      "return Reflect.apply((Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value['reject'], (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value, [error])",
      'return Reflect.get(Promise, "reject")(error)',
      'return Reflect.get?.(Promise, "reject")(error)',
      'return Reflect.get(window.Promise, "reject").call(window.Promise, error)',
      'return (window).Reflect.get(Promise, "reject")(error)',
      'return window.Reflect["get"](Promise, "reject")(error)',
      'return (Reflect.get)(Promise, "reject")(error)',
      'return (Reflect.get)?.(Promise, "reject")(error)',
      'return (window.Reflect["get"])(Promise, "reject")(error)',
      'return Reflect.get.call(Reflect, Promise, "reject")(error)',
      'return window.Reflect["get"].apply(window.Reflect, [Promise, "reject"])(error)',
      'return Object.getOwnPropertyDescriptor(Promise, "reject")?.value(error)',
      'return Object.getOwnPropertyDescriptor?.(Promise, "reject")?.value(error)',
      'return globalThis.Object.getOwnPropertyDescriptor(Promise, "reject")?.value(error)',
      'return (globalThis).Object.getOwnPropertyDescriptor(Promise, "reject")?.value(error)',
      'return (Object.getOwnPropertyDescriptor)(Promise, "reject")?.value(error)',
      'return (Object.getOwnPropertyDescriptor)?.(Promise, "reject")?.value(error)',
      'return (globalThis.Object.getOwnPropertyDescriptor)(Promise, "reject")?.value(error)',
      'return Object.getOwnPropertyDescriptor.call(Object, Promise, "reject")?.value(error)',
      'return window.Object["getOwnPropertyDescriptor"].apply(window.Object, [Promise, "reject"])?.value(error)',
      'return Object.getOwnPropertyDescriptor(Promise, "reject")?.value.apply(Promise, [error])',
      'return Reflect.apply(Reflect.get(Promise, "reject"), Promise, [error])',
      'return Reflect.apply?.(Reflect.get(Promise, "reject"), Promise, [error])',
      'return window.Reflect["apply"](Reflect.get(Promise, "reject"), Promise, [error])',
      'return globalThis.Reflect.apply(Object.getOwnPropertyDescriptor(Promise, "reject")?.value, Promise, [error])',
      'return (Reflect.apply)(Reflect.get(Promise, "reject"), Promise, [error])',
      'return (Reflect.apply)?.(Reflect.get(Promise, "reject"), Promise, [error])',
      'return (window.Reflect["apply"])(Object.getOwnPropertyDescriptor(Promise, "reject")?.value, Promise, [error])',
    ]) {
      expect(
        auditRawUiErrorThrows(
          `
            try {
              await save()
            } catch (error) {
              ${rejectedExpression}
            }
          `,
          'apps/frontend/src/pages/FixturePage.tsx',
        ),
      ).toHaveLength(1)
    }

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            return new Promise((_resolve, reject) => reject(error))
            return new Promise((_resolve, reject) => reject?.(error))
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(2)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            return new Promise((_resolve, reject) => reject.call(undefined, error))
            return new Promise((_resolve, reject) => reject.apply(undefined, [error]))
            return new Promise((_resolve, reject) => reject.bind(undefined)(error))
            return new Promise((_resolve, reject) => Reflect.apply(reject, undefined, [error]))
            return new Promise((_resolve, reject) => Reflect.apply?.(reject, undefined, [error]))
            return new Promise((_resolve, reject) => globalThis.Reflect.apply(reject, undefined, [error]))
            return new Promise((_resolve, reject) => window.Reflect['apply'](reject, undefined, [error]))
            return new Promise((_resolve, reject) => window.Reflect['apply']?.(reject, undefined, [error]))
            return new Promise((_resolve, reject) => (Reflect.apply)(reject, undefined, [error]))
            return new Promise((_resolve, reject) => (Reflect.apply)?.(reject, undefined, [error]))
            return new Promise((_resolve, reject) => { const apply = Reflect.apply; return apply(reject, undefined, [error]) })
            return new Promise((_resolve, reject) => { const typedApply: typeof Reflect.apply = Reflect.apply; return typedApply(reject, undefined, [error]) })
            return new Promise((_resolve, reject) => { const { apply } = Reflect; return apply(reject, undefined, [error]) })
            return new Promise((_resolve, reject) => { const { apply: reflectApply } = Reflect; return reflectApply(reject, undefined, [error]) })
            return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow(error) })
            return new Promise((_resolve, reject) => { const typedReject: typeof reject = reject; return typedReject(error) })
            return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.call(undefined, error) })
            return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.apply(undefined, [error]) })
            return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.bind(undefined)(error) })
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(19)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            return new Promise(function (_resolve, reject) {
              reject(error)
            })
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            return Promise.reject(problem)
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            return Promise.reject(problem)
            return Promise?.reject?.(problem)
            return Promise['reject'](problem)
            return Promise?.['reject']?.(problem as Error)
            return window.Promise.reject(problem)
            return globalThis.Promise?.['reject']?.(problem as Error)
            return (window).Promise.reject(problem)
            return globalThis['Promise']['reject'](problem)
            return Reflect.get(window, 'Promise').reject(problem)
            return (window).Reflect.get(window, 'Promise').reject(problem)
            return Reflect.get?.(window, 'Promise').reject(problem)
            return (Reflect.get)?.(window, 'Promise').reject(problem)
            return Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value.reject(problem)
            return (globalThis).Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value.reject(problem)
            return Object.getOwnPropertyDescriptor?.(globalThis, 'Promise')?.value.reject(problem)
            return (Object.getOwnPropertyDescriptor)?.(globalThis, 'Promise')?.value.reject(problem)
            return Reflect.get.apply(Reflect, [window, 'Promise']).reject(problem)
            return Reflect.get.bind(Reflect)(window, 'Promise').reject(problem)
            return Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value.reject(problem)
            return Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value.reject(problem)
            return (Reflect.get.apply)(Reflect, [window, 'Promise']).reject(problem)
            return (Reflect.get.bind(Reflect))(window, 'Promise').reject(problem)
            return (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value.reject(problem)
            return (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value.reject(problem)
            return (Reflect.get.apply)?.(Reflect, [window, 'Promise']).reject(problem)
            return (Reflect.get.bind(Reflect))?.(window, 'Promise').reject(problem)
            return (Object.getOwnPropertyDescriptor.apply)?.(Object, [globalThis, 'Promise'])?.value.reject(problem)
            return (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value.reject(problem)
          }
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(28)

    for (const rejectedExpression of [
      'return Promise.reject.call(Promise, problem)',
      'return Promise.reject.apply(Promise, [problem])',
      'return Promise.reject.bind(Promise)(problem)',
      "return globalThis['Promise']['reject'].call(globalThis['Promise'], problem)",
      'return Reflect.apply(Promise.reject, Promise, [problem])',
      'return Reflect.apply?.(Promise.reject, Promise, [problem])',
      'return globalThis.Reflect.apply(Promise.reject, Promise, [problem])',
      "return window.Reflect['apply'](Promise.reject, Promise, [problem])",
      "return window.Reflect['apply']?.(Promise.reject, Promise, [problem])",
      'return (Reflect.apply)(Promise.reject, Promise, [problem])',
      'return (Reflect.apply)?.(Promise.reject, Promise, [problem])',
      "return (window.Reflect['apply'])(Promise.reject, Promise, [problem])",
      "return Reflect.apply(globalThis['Promise']['reject'], globalThis['Promise'], [problem])",
      "return Reflect.apply(Reflect.get(window, 'Promise').reject, Reflect.get(window, 'Promise'), [problem])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value['reject'], Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value, [problem])",
      "return Reflect.apply(Reflect.get.apply(Reflect, [window, 'Promise']).reject, Reflect.get.apply(Reflect, [window, 'Promise']), [problem])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value['reject'], Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value, [problem])",
      "return Reflect.apply((Reflect.get.apply)(Reflect, [window, 'Promise']).reject, (Reflect.get.apply)(Reflect, [window, 'Promise']), [problem])",
      "return Reflect.apply((Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value['reject'], (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value, [problem])",
      'return Reflect.get(Promise, "reject")(problem)',
      'return Reflect.get?.(Promise, "reject")(problem)',
      'return globalThis.Reflect.get(Promise, "reject")(problem)',
      'return (window).Reflect.get(Promise, "reject")(problem)',
      'return (Reflect.get)(Promise, "reject")(problem)',
      'return (Reflect.get)?.(Promise, "reject")(problem)',
      "return (window.Reflect['get'])(Promise, 'reject')(problem)",
      'return Reflect.get.call(Reflect, Promise, "reject")(problem)',
      "return window.Reflect['get'].apply(window.Reflect, [Promise, 'reject'])(problem)",
      'return Object.getOwnPropertyDescriptor(Promise, "reject")?.value(problem)',
      'return Object.getOwnPropertyDescriptor?.(Promise, "reject")?.value(problem)',
      'return Object["getOwnPropertyDescriptor"](Promise, "reject")?.value(problem)',
      'return (globalThis).Object.getOwnPropertyDescriptor(Promise, "reject")?.value(problem)',
      'return (Object.getOwnPropertyDescriptor)(Promise, "reject")?.value(problem)',
      'return (Object.getOwnPropertyDescriptor)?.(Promise, "reject")?.value(problem)',
      "return (Object['getOwnPropertyDescriptor'])(Promise, 'reject')?.value(problem)",
      'return Object.getOwnPropertyDescriptor.call(Object, Promise, "reject")?.value(problem)',
      "return Object['getOwnPropertyDescriptor'].apply(Object, [Promise, 'reject'])?.value(problem)",
      'return Reflect.apply(Reflect.get(Promise, "reject"), Promise, [problem])',
      'return Reflect.apply?.(Reflect.get(Promise, "reject"), Promise, [problem])',
      'return globalThis.Reflect.apply(Reflect.get(Promise, "reject"), Promise, [problem])',
      "return window.Reflect['apply'](Object['getOwnPropertyDescriptor'](Promise, 'reject')?.value, Promise, [problem])",
      'return (Reflect.apply)(Reflect.get(Promise, "reject"), Promise, [problem])',
      'return (Reflect.apply)?.(Reflect.get(Promise, "reject"), Promise, [problem])',
      "return (window.Reflect['apply'])(Object['getOwnPropertyDescriptor'](Promise, 'reject')?.value, Promise, [problem])",
    ]) {
      expect(
        auditRawUiErrorThrows(
          `
            try {
              await save()
            } catch (problem) {
              ${rejectedExpression}
            }
          `,
          'apps/frontend/src/components/FixturePanel.tsx',
        ),
      ).toHaveLength(1)
    }

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            return new Promise((_resolve, reject) => {
              reject(problem as Error)
            })
          }
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            return new Promise(function rejectLater(_resolve, reject) {
              window.Reflect['apply'](reject, undefined, [problem as Error])
            })
            return new Promise(function optionalRejectLater(_resolve, reject) {
              window.Reflect['apply']?.(reject, undefined, [problem as Error])
            })
          }
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(2)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            return new Promise(function rejectLater(_resolve, reject) {
              reject?.(problem as Error)
            })
          }
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          const rejectNow = Promise.reject
          let rejectLater = Promise?.['reject'] as typeof Promise.reject
          const { reject } = Promise
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'หน้า UI ห้าม alias Promise.reject; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.',
      'หน้า UI ห้าม alias Promise.reject; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.',
      'หน้า UI ห้าม alias Promise.reject; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.',
    ])

    expect(
      auditRawUiErrorThrows(
        `
          const { reject: reflectedReject } = Reflect.get(window, 'Promise')
          const { reject: descriptorReject } = Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
          const { reject: parenthesizedReflectNamespaceReject } = (window).Reflect.get(window, 'Promise')
          const { reject: parenthesizedObjectNamespaceReject } = (globalThis).Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
          const { reject: optionalReflectedReject } = Reflect.get?.(window, 'Promise')
          const { reject: optionalDescriptorReject } = Object.getOwnPropertyDescriptor?.(globalThis, 'Promise')?.value
          const { reject: applyReflectedReject } = Reflect.get.apply(Reflect, [window, 'Promise'])
          const { reject: bindDescriptorReject } = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value
          const { reject: parenthesizedApplyReject } = (Reflect.get.apply)(Reflect, [window, 'Promise'])
          const { reject: parenthesizedBindReject } = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value
          const { reject: optionalApplyReject } = (Reflect.get.apply)?.(Reflect, [window, 'Promise'])
          const { reject: optionalBindReject } = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ).filter((finding) => finding.message.includes('alias Promise.reject')),
    ).toHaveLength(12)

    expect(
      auditRawUiErrorThrows(
        `
          const promiseCtor = Promise
          const typedPromiseCtor: PromiseConstructor = window.Promise
          promiseCtor = (globalThis.Promise)
          const bracketPromiseCtor = window['Promise']
          promiseCtor = (globalThis)['Promise']
          const reflectedPromiseCtor = Reflect.get(window, 'Promise')
          const parenthesizedReflectPromiseCtor = (window).Reflect.get(window, 'Promise')
          const optionalReflectedPromiseCtor = Reflect.get?.(window, 'Promise')
          promiseCtor = Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
          promiseCtor = (globalThis).Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
          promiseCtor = Object.getOwnPropertyDescriptor?.(globalThis, 'Promise')?.value
          const applyReflectedPromiseCtor = Reflect.get.apply(Reflect, [window, 'Promise'])
          promiseCtor = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value
          const parenthesizedApplyPromiseCtor = (Reflect.get.apply)(Reflect, [window, 'Promise'])
          promiseCtor = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value
          const optionalApplyPromiseCtor = (Reflect.get.apply)?.(Reflect, [window, 'Promise'])
          promiseCtor = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ).filter((finding) => finding.message.includes('alias Promise object')),
    ).toHaveLength(17)

    expect(
      auditRawUiErrorThrows(
        `
          const reflectedReject = Reflect.get(Promise, 'reject')
          const descriptorReject = Object.getOwnPropertyDescriptor(Promise, 'reject')?.value
          const optionalReflectedReject = Reflect.get?.(Promise, 'reject')
          const optionalDescriptorReject = Object.getOwnPropertyDescriptor?.(Promise, 'reject')?.value
          const reflectedRejectViaWindow = window.Reflect['get'](Promise, 'reject')
          const reflectedRejectViaParenthesizedWindow = (window).Reflect.get(Promise, 'reject')
          const descriptorRejectViaBracket = Object['getOwnPropertyDescriptor'](Promise, 'reject')?.value
          const descriptorRejectViaParenthesizedGlobal = (globalThis).Object.getOwnPropertyDescriptor(Promise, 'reject')?.value
          const reflectedRejectViaCall = Reflect.get.call(Reflect, Promise, 'reject')
          const descriptorRejectViaApply = Object.getOwnPropertyDescriptor.apply(Object, [Promise, 'reject'])?.value
          const reflectedNamespaceReject = Reflect.get(Reflect.get(window, 'Promise'), 'reject')
          const descriptorNamespaceReject = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value, 'reject')?.value
          const optionalReflectedNamespaceReject = Reflect.get(Reflect.get?.(window, 'Promise'), 'reject')
          const optionalDescriptorNamespaceReject = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor?.(globalThis, 'Promise')?.value, 'reject')?.value
          const applyReflectedNamespaceReject = Reflect.get(Reflect.get.apply(Reflect, [window, 'Promise']), 'reject')
          const bindDescriptorNamespaceReject = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value, 'reject')?.value
          const parenthesizedApplyNamespaceReject = Reflect.get((Reflect.get.apply)(Reflect, [window, 'Promise']), 'reject')
          const parenthesizedBindNamespaceReject = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value, 'reject')?.value
          const optionalApplyNamespaceReject = Reflect.get((Reflect.get.apply)?.(Reflect, [window, 'Promise']), 'reject')
          const optionalBindNamespaceReject = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value, 'reject')?.value
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ).filter((finding) => finding.message.includes('alias Promise.reject')),
    ).toHaveLength(20)

    expect(
      auditRawUiErrorThrows(
        `
          const typedRejectLater: typeof Promise.reject = Promise.reject
        `,
        'apps/frontend/src/components/FixturePanel.tsx',
      ).map((finding) => finding.message),
    ).toEqual(['หน้า UI ห้าม alias Promise.reject; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.'])

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem) {
            throw problem
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(1)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (error) {
            throw error
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])
  })

  test('reports risky frontend DOM and code execution patterns', () => {
    const findings = auditSuspiciousPatterns(
      `
        <section dangerouslySetInnerHTML={{ __html: html }} />
        element.innerHTML = html
        element . innerHTML = html
        <iframe srcDoc={html} />
        <iframe srcdoc="<script>alert(1)</script>" />
        document . cookie = token
        window . location . href = url
        location . assign(url)
        globalThis . location . replace(url)
        eval(userInput)
        const fn = new Function(userInput)
        window.open(url, '_blank')
        window . open(url, '_blank')
        globalThis . open(url, '_blank')
        open(url, '_blank')
        window.alert('ใช้ toast แทน')
        window . confirm('ใช้ modal แทน')
        globalThis . prompt('ใช้ form แทน')
        alert('ใช้ toast แทน')
        confirm('ใช้ modal แทน')
        prompt('ใช้ form แทน')
        window.postMessage(payload, '*')
        window.postMessage(payload, 'https://app.example.com')
        globalThis.addEventListener('message', handler)
        <a href="javascript:alert(1)">Bad protocol</a>
        <a href = "vbscript:alert(1)">Bad spaced protocol</a>
        <a href=" JAVASCRIPT:alert(1)">Bad padded protocol</a>
        <Link to={'data:text/html,<h1>x</h1>'}>Bad protocol</Link>
        <Link to = {\`javascript:alert(1)\`}>Bad spaced protocol</Link>
        <Link to = {' data:text/html,<h1>x</h1>'}>Bad padded expression protocol</Link>
        console.error('โหลดข้อมูลไม่สำเร็จ:', error)
        console.error(
          'โหลดข้อมูลไม่สำเร็จ:',
          error,
        )
        console.warn('โหลดข้อมูลช้า:', error)
        console.error(error)
        console.warn(error, 'โหลดข้อมูลช้า')
        console.error.call(console, error)
        console.warn.apply(console, [error, 'โหลดข้อมูลช้า'])
        console.error.bind(console)(error)
        console.warn.bind(console)('โหลดข้อมูลช้า', error)
        Reflect.apply(console.error, console, [error])
        Reflect.apply(console.warn, console, ['โหลดข้อมูลช้า', error])
        Reflect.get(console, 'error')(error)
        Reflect.get(window.console, 'warn')('โหลดข้อมูลช้า', error)
        Reflect.get(console, 'error').call(console, error)
        Reflect.get(window.console, 'warn').apply(window.console, ['โหลดข้อมูลช้า', error])
        Reflect.get(console, 'error').bind(console)(error)
        Object.getOwnPropertyDescriptor(console, 'error')?.value(error)
        Object.getOwnPropertyDescriptor(window.console, 'warn')?.value.call(window.console, 'โหลดข้อมูลช้า', error)
        Object.getOwnPropertyDescriptor(console, 'error')?.value.apply(console, [error])
        Object.getOwnPropertyDescriptor(console, 'error')?.value.bind(console)(error)
        globalThis.console.error(error)
        window.console.warn('โหลดข้อมูลช้า', error)
      `,
      'RiskyFrontendFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'ห้ามใช้ dangerouslySetInnerHTML ใน frontend source ก่อนมี sanitizer และ review ชัดเจน',
      'ห้ามเขียน innerHTML โดยตรงใน frontend source',
      'ห้ามเขียน innerHTML โดยตรงใน frontend source',
      'ห้ามฝัง HTML ผ่าน iframe srcDoc/srcdoc ใน frontend source ก่อนมี sanitizer และ sandbox policy ชัดเจน',
      'ห้ามฝัง HTML ผ่าน iframe srcDoc/srcdoc ใน frontend source ก่อนมี sanitizer และ sandbox policy ชัดเจน',
      'ห้ามอ่านหรือเขียน document.cookie ตรงใน frontend source; ให้ใช้ auth/storage helper ที่ควบคุมได้',
      'ห้าม redirect ด้วย location.href/assign/replace ตรงใน frontend source; ให้ใช้ router หรือลิงก์ที่ตรวจสอบได้',
      'ห้าม redirect ด้วย location.href/assign/replace ตรงใน frontend source; ให้ใช้ router หรือลิงก์ที่ตรวจสอบได้',
      'ห้าม redirect ด้วย location.href/assign/replace ตรงใน frontend source; ให้ใช้ router หรือลิงก์ที่ตรวจสอบได้',
      'ห้ามใช้ eval() ใน frontend source',
      'ห้ามใช้ new Function() ใน frontend source',
      'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
      'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
      'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
      'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามใช้ browser dialog แบบ alert/confirm/prompt ตรงใน frontend source; ใช้ modal หรือ toast ของแอปแทน',
      'ห้ามเรียก postMessage ตรงใน frontend source; ให้ใช้ crossWindowMessaging helper เพื่อคุม target origin และ schema ของ event',
      'ห้ามเรียก postMessage ตรงใน frontend source; ให้ใช้ crossWindowMessaging helper เพื่อคุม target origin และ schema ของ event',
      'ห้ามรับ message event ตรงใน frontend source; ให้ใช้ crossWindowMessaging helper ที่ตรวจ event.origin ชัดเจน',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
    ])
  })

  test('reports alternate catch-variable raw frontend error logs', () => {
    expect(
      auditSuspiciousPatterns(
        `
          try {
            await load()
          } catch (problem) {
            console.error('โหลดข้อมูลไม่สำเร็จ:', problem)
            console.warn(problem, 'โหลดข้อมูลช้า')
            console.error(problem as Error)
            console.warn((problem as Error), 'โหลดข้อมูลช้า')
            console?.error(problem)
            console.warn?.(problem, 'slow')
            console['error'](problem)
            console?.['warn']?.(problem, 'slow bracket')
            console.error.call(console, problem)
            console.warn.apply(console, [problem, 'slow apply'])
            console.error.bind(console)(problem)
            console.warn.bind(console)('slow bind', problem)
            Reflect.apply(console.error, console, [problem])
            Reflect.apply(console.warn, console, ['slow reflect', problem])
            Reflect.get(console, 'error')(problem)
            Reflect.get(window.console, 'warn')('slow reflect get', problem)
            Reflect.get(console, 'error').call(console, problem)
            Reflect.get(window.console, 'warn').apply(window.console, ['slow reflect get', problem])
            Reflect.get(console, 'error').bind(console)(problem)
            Object.getOwnPropertyDescriptor(console, 'error')?.value(problem)
            Object.getOwnPropertyDescriptor(window.console, 'warn')?.value.call(window.console, 'slow descriptor', problem)
            Object.getOwnPropertyDescriptor(console, 'error')?.value.apply(console, [problem])
            Object.getOwnPropertyDescriptor(console, 'error')?.value.bind(console)(problem)
            window.console.error(problem)
            globalThis.console.warn('slow global', problem)
            console.error('สรุปแล้ว:', safeBrowserErrorSummary(problem))
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
    ])
  })

  test('reports frontend console method aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const logError = console.error
        const typedLogError: typeof console.error = console.error
        let logWarn = window.console.warn.bind(console)
        logError = globalThis.console['error']
        const assertedError = console.error as typeof console.error
        const parenthesizedError = (console.error)
        parenthesizedWarn = (window.console.warn) as typeof console.warn
        const parenthesizedRootError = (window).console.error
        parenthesizedRootWarn = (globalThis)['console']['warn'] as typeof console.warn
        const bracketError = window['console'].error
        bracketWarn = globalThis['console']['warn'] as typeof console.warn
        const parenthesizedBracketError = (window['console']).error
        parenthesizedBracketWarn = (globalThis['console'])['warn'] as typeof console.warn
        const reflectedError = Reflect.get(console, 'error')
        const optionalReflectedError = Reflect.get?.(console, 'error')
        reflectedError = Reflect.get(window.console, 'warn') as typeof console.warn
        const reflectedErrorViaWindow = window.Reflect['get'](console, 'error')
        const reflectedErrorViaParenthesizedWindow = (window).Reflect.get(console, 'error')
        const reflectedErrorViaParen = (Reflect.get)(console, 'error')
        const reflectedErrorViaCall = Reflect.get.call(Reflect, console, 'error')
        const reflectedNamespaceError = Reflect.get(Reflect.get(window, 'console'), 'error')
        const parenthesizedRootNamespaceError = Reflect.get(Reflect.get((window), 'console'), 'error')
        const applyNamespaceError = Reflect.get(Reflect.get.apply(Reflect, [window, 'console']), 'error')
        const parenthesizedApplyNamespaceError = Reflect.get((Reflect.get.apply)(Reflect, [window, 'console']), 'error')
        const descriptorError = Object.getOwnPropertyDescriptor(console, 'error')?.value
        const optionalDescriptorError = Object.getOwnPropertyDescriptor?.(console, 'error')?.value
        descriptorError = Object.getOwnPropertyDescriptor(window.console, 'warn')?.value as typeof console.warn
        const descriptorErrorViaWindow = window.Object['getOwnPropertyDescriptor'](console, 'warn')?.value
        const descriptorErrorViaParenthesizedGlobal = (globalThis).Object.getOwnPropertyDescriptor(console, 'warn')?.value
        const descriptorErrorViaParen = (Object.getOwnPropertyDescriptor)(console, 'warn')?.value
        const descriptorErrorViaApply = Object.getOwnPropertyDescriptor.apply(Object, [console, 'warn'])?.value
        const descriptorNamespaceWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor(globalThis, 'console')?.value, 'warn')?.value
        const descriptorParenthesizedRootWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor((globalThis), 'console')?.value, 'warn')?.value
        const descriptorBindNamespaceWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value, 'warn')?.value
        const descriptorParenthesizedBindNamespaceWarn = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value, 'warn')?.value
        const optionalApplyNamespaceError = Reflect.get((Reflect.get.apply)?.(Reflect, [window, 'console']), 'error')
        const descriptorOptionalBindNamespaceWarn = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value, 'warn')?.value
        const { error: aliasedError, warn } = console
        const { error: bracketAliasedError } = window['console']
        const { warn: parenthesizedBracketAliasedWarn } = (globalThis['console'])
        console.error('safe summary:', safeBrowserErrorSummary(error))
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias console.error/console.warn'))).toHaveLength(40)

    expect(
      auditSuspiciousPatterns(
        `
          const { error: typedAliasedError, warn: typedWarn }: Console = console
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      )
        .map((finding) => finding.message)
        .filter((message) => message.includes('alias console.error/console.warn')),
    ).toHaveLength(1)
  })

  test('reports frontend retrieval method aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const getReflect = Reflect.get
        const typedGetReflect: typeof Reflect.get = window.Reflect['get']
        const parenthesizedTypedGetReflect: typeof Reflect.get = (window).Reflect.get
        getReflect = (Reflect.get)
        const getDescriptor = Object.getOwnPropertyDescriptor
        descriptorLater = window.Object['getOwnPropertyDescriptor'] as typeof Object.getOwnPropertyDescriptor
        descriptorLater = (globalThis).Object.getOwnPropertyDescriptor as typeof Object.getOwnPropertyDescriptor
        const { get } = Reflect
        const { get: reflectGet } = window.Reflect
        const { getOwnPropertyDescriptor: getOwn } = window.Object
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias Reflect.get/Object.getOwnPropertyDescriptor'))).toHaveLength(10)
  })

  test('reports frontend Reflect.apply aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const applyReflect = Reflect.apply
        const typedApplyReflect: typeof Reflect.apply = window.Reflect['apply']
        const parenthesizedTypedApplyReflect: typeof Reflect.apply = (window).Reflect.apply
        applyReflect = (Reflect.apply)
        const { apply } = Reflect
        const { apply: reflectApply } = window.Reflect
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias Reflect.apply'))).toHaveLength(6)
  })

  test('reports frontend Reflect object aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const reflectNs = Reflect
        const typedReflectNs: typeof Reflect = window.Reflect
        const parenthesizedTypedReflectNs: typeof Reflect = (window).Reflect
        reflectNs = (globalThis.Reflect)
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias Reflect object'))).toHaveLength(4)
  })

  test('reports frontend Object object aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const objectNs = Object
        const typedObjectNs: ObjectConstructor = window.Object
        const parenthesizedTypedObjectNs: ObjectConstructor = (globalThis).Object
        objectNs = (globalThis.Object)
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias Object object'))).toHaveLength(4)
  })

  test('reports frontend Reflect.apply console retrieval targets', () => {
    const messages = auditSuspiciousPatterns(
      `
        try {
          await load()
        } catch (problem) {
          Reflect.apply(Reflect.get(console, 'error'), console, [problem])
          Reflect.apply?.(Reflect.get(console, 'error'), console, [problem])
          Reflect.apply(Reflect.get?.(console, 'error'), console, [problem])
          Reflect.apply(Reflect.get(window.console, 'warn'), window.console, ['slow reflect target', problem])
          Reflect.apply((window).console.error, console, [problem])
          Reflect.apply((globalThis)['console']['warn'], console, ['slow parenthesized root', problem])
          Reflect.apply(Reflect.get(Reflect.get(window, 'console'), 'error'), console, [problem])
          Reflect.apply(Reflect.get(Reflect.get((window), 'console'), 'error'), console, [problem])
          Reflect.apply(Reflect.get(Reflect.get.apply(Reflect, [window, 'console']), 'error'), console, [problem])
          Reflect.apply(Reflect.get((Reflect.get.apply)(Reflect, [window, 'console']), 'error'), console, [problem])
          Reflect.apply(Reflect.get((window['console']), 'error'), window.console, [problem])
          Reflect.apply(Object.getOwnPropertyDescriptor(console, 'error')?.value, console, [problem])
          Reflect.apply(Object.getOwnPropertyDescriptor(window.console, 'warn')?.value, window.console, ['slow descriptor target', problem])
          Reflect.apply(Object.getOwnPropertyDescriptor(Reflect.get(globalThis, 'console'), 'warn')?.value, console, ['slow retrieved namespace target', problem])
          Reflect.apply(Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor((globalThis), 'console')?.value, 'warn')?.value, console, ['slow parenthesized namespace target', problem])
          Reflect.apply(Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value, 'warn')?.value, console, ['slow method-forwarded namespace target', problem])
          Reflect.apply(Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value, 'warn')?.value, console, ['slow parenthesized method-forwarded namespace target', problem])
          Reflect.apply(Reflect.get((Reflect.get.apply)?.(Reflect, [window, 'console']), 'error'), console, [problem])
          Reflect.apply(Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value, 'warn')?.value, console, ['slow optional method-forwarded namespace target', problem])
          Reflect.apply(Object.getOwnPropertyDescriptor((globalThis['console']), 'warn')?.value, globalThis.console, ['slow descriptor target', problem])
          globalThis.Reflect.apply(Reflect.get(console, 'error'), console, [problem])
          window.Reflect['apply'](window.Reflect['get'](console, 'warn'), window.console, ['slow reflect target', problem])
          window.Reflect['apply']?.(window.Reflect['get'](console, 'warn'), window.console, ['slow optional reflect target', problem])
          (Reflect.apply)(Object.getOwnPropertyDescriptor(console, 'error')?.value, console, [problem])
          (Reflect.apply)?.(Object.getOwnPropertyDescriptor(console, 'error')?.value, console, [problem])
          (window.Reflect['apply'])(window.Object['getOwnPropertyDescriptor'](console, 'warn')?.value, window.console, ['slow descriptor target', problem])
          globalThis.Reflect.get(console, 'error')(problem)
          (window).Reflect.get(console, 'error')(problem)
          window.Reflect['get'](window.console, 'warn').call(window.console, 'slow reflect get', problem)
          window.Object['getOwnPropertyDescriptor'](console, 'error')?.value(problem)
          (globalThis).Object.getOwnPropertyDescriptor(console, 'error')?.value(problem)
          Reflect.apply((Reflect.get)(console, 'error'), console, [problem])
          Reflect.get?.(console, 'error')(problem)
          Reflect.apply((Object.getOwnPropertyDescriptor)(console, 'warn')?.value, console, [problem])
          Object.getOwnPropertyDescriptor?.(console, 'error')?.value(problem)
          (Reflect.get)(console, 'error')(problem)
          (Reflect.get)((window['console']), 'error')(problem)
          (window.Object['getOwnPropertyDescriptor'])(console, 'warn')?.value(problem)
          (window.Object['getOwnPropertyDescriptor'])((globalThis['console']), 'warn')?.value(problem)
          Reflect.apply(Reflect.get.call(Reflect, console, 'error'), console, [problem])
          Reflect.get.call(Reflect, console, 'error')(problem)
          (Reflect.get.apply)(Reflect, [console, 'error'])(problem)
          (Reflect.get.apply)?.(Reflect, [console, 'error'])(problem)
          Object.getOwnPropertyDescriptor.call(Object, console, 'error')?.value(problem)
          window.Object['getOwnPropertyDescriptor'].apply(window.Object, [console, 'warn'])?.value(problem)
          (Object.getOwnPropertyDescriptor.bind(Object))(console, 'error')?.value(problem)
          (Object.getOwnPropertyDescriptor.bind(Object))?.(console, 'error')?.value(problem)
          Reflect.apply((globalThis).Object.getOwnPropertyDescriptor(console, 'warn')?.value, console, [problem])
          console.error('safe summary:', safeBrowserErrorSummary(problem))
        }
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('log raw error object'))).toHaveLength(49)
  })

  test('reports frontend console object aliases', () => {
    const messages = auditSuspiciousPatterns(
      `
        const logger = console
        const typedLogger: Console = console
        let globalLogger = globalThis.console as Console
        logger = window.console
        const parenthesizedLogger = (console)
        globalLogger = (window.console)
        const parenthesizedRootObjectLogger = (window).console
        globalLogger = (globalThis)['console']
        const bracketLogger = window['console']
        globalLogger = globalThis['console']
        const parenthesizedBracketLogger = (window['console'])
        globalLogger = (globalThis['console'])
        const reflectedLogger = Reflect.get(window, 'console')
        const parenthesizedNamespaceReflectedLogger = (window).Reflect.get(window, 'console')
        const optionalReflectedLogger = Reflect.get?.(window, 'console')
        const parenthesizedRootLogger = Reflect.get((window), 'console')
        const applyRootLogger = Reflect.get.apply(Reflect, [window, 'console'])
        const parenthesizedApplyRootLogger = (Reflect.get.apply)(Reflect, [window, 'console'])
        const optionalApplyRootLogger = (Reflect.get.apply)?.(Reflect, [window, 'console'])
        globalLogger = Object.getOwnPropertyDescriptor(globalThis, 'console')?.value
        globalLogger = (globalThis).Object.getOwnPropertyDescriptor(globalThis, 'console')?.value
        globalLogger = Object.getOwnPropertyDescriptor?.(globalThis, 'console')?.value
        globalLogger = Object.getOwnPropertyDescriptor((globalThis), 'console')?.value
        globalLogger = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value
        globalLogger = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value
        globalLogger = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value
        console.error('safe summary:', safeBrowserErrorSummary(error))
      `,
      'apps/frontend/src/pages/FixturePage.tsx',
    ).map((finding) => finding.message)

    expect(messages.filter((message) => message.includes('alias console object'))).toHaveLength(26)
  })

  test('reports typed catch-variable raw frontend errors', () => {
    expect(
      auditSuspiciousPatterns(
        `
          try {
            await signIn()
          } catch (problem: unknown) {
            const safeMessage = userSafeErrorMessage(problem)
            const rawAuthMessage = problem.message.toLowerCase()
            setNotice(problem instanceof Error ? problem.message : safeMessage)
            console.warn(problem, 'slow')
          }
        `,
        'apps/frontend/src/pages/AuthFixturePage.tsx',
      ),
    ).toHaveLength(3)

    expect(
      auditRawUiErrorThrows(
        `
          try {
            await save()
          } catch (problem: any) {
            throw problem
          }
        `,
        'apps/frontend/src/pages/FixturePage.tsx',
      ),
    ).toHaveLength(1)
  })

  test('reports raw response JSON parsing outside frontend API helpers', () => {
    expect(
      auditFrontendSourceFile(
        `
          async function loadCharacters() {
            const response = await fetch('/characters')
            return response . clone () . json()
          }
        `,
        'ApiLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้าม parse response.json() ตรงใน frontend source; ให้ใช้ readApiJson/readErrorPayload เพื่อห่อ JSON พังเป็นข้อความไทยก่อน.')

    expect(
      auditFrontendSourceFile(
        `
          async function readErrorPayload(response: Response) {
            return response.clone().json().catch(() => null)
          }

          async function readApiJson<T>(path: string, response: Response): Promise<T> {
            try {
              return (await response.json()) as T
            } catch {
              throw new ApiError(path, 502, malformedApiJsonPayload)
            }
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])
  })

  test('reports raw response text parsing in frontend source', () => {
    expect(
      auditRawResponseTextParsing(
        `
          async function loadPlainError(response: Response) {
            const raw = await response . text()
            setToast(raw)
          }
        `,
        'ApiTextLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้ามอ่าน response.text() ตรงใน frontend source; ให้ backend/API helper แปลงเป็น ApiError ข้อความไทยที่ควบคุมได้ก่อนถึง UI.')

    expect(
      auditFrontendSourceFile(
        `
          async function loadPlainError(response: Response) {
            return response.clone().text()
          }
        `,
        'ApiTextLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้ามอ่าน response.text() ตรงใน frontend source; ให้ backend/API helper แปลงเป็น ApiError ข้อความไทยที่ควบคุมได้ก่อนถึง UI.')
  })

  test('reports direct frontend fetch outside the central API helper', () => {
    expect(
      auditRawFrontendFetchUsage(
        `
          async function loadCharacters() {
            return fetch('/characters')
          }
          async function loadWithWindowFetch() {
            return window . fetch('/characters')
          }
          async function loadWithGlobalFetch() {
            return globalThis.fetch('/characters')
          }
        `,
        'apps/frontend/src/pages/ExplorePage.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'ห้ามเรียก fetch ตรงนอก apps/frontend/src/lib/api.ts; ให้ผ่าน API helper กลางเพื่อคุม auth, error, stream และ diagnostics ให้สม่ำเสมอ.',
      'ห้ามเรียก fetch ตรงนอก apps/frontend/src/lib/api.ts; ให้ผ่าน API helper กลางเพื่อคุม auth, error, stream และ diagnostics ให้สม่ำเสมอ.',
      'ห้ามเรียก fetch ตรงนอก apps/frontend/src/lib/api.ts; ให้ผ่าน API helper กลางเพื่อคุม auth, error, stream และ diagnostics ให้สม่ำเสมอ.',
    ])

    expect(
      auditRawFrontendFetchUsage(
        `
          export async function requestJson(path: string) {
            return fetch(path)
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])
  })

  test('reports unmounted frontend components except explicit allowlist entries', async () => {
    const fixtureRoot = join(process.cwd(), 'apps/frontend/src')
    const files = [
      join(fixtureRoot, 'components/DeadPanel.tsx'),
      join(fixtureRoot, 'components/LivePanel.tsx'),
      join(fixtureRoot, 'components/AuthPanel.tsx'),
      join(fixtureRoot, 'pages/LivePage.tsx'),
    ]
    const contents = new Map([
      [files[0], 'export function DeadPanel() { return <section /> }'],
      [files[1], 'export function LivePanel() { return <section /> }'],
      [files[2], 'export function AuthPanel() { return <section /> }'],
      [files[3], "import { LivePanel } from '../components/LivePanel'\nexport function LivePage() { return <LivePanel /> }"],
    ])

    const findings = await auditUnmountedFrontendComponents(files, async (file) => contents.get(file) ?? '')

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/components/DeadPanel.tsx',
        line: 1,
        message:
          'component หน้าบ้านไม่ได้ถูก import หรือ mount จาก source อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
      },
    ])
  })

  test('reports stale or unexplained frontend allowlist entries', () => {
    const files = [
      {
        file: join(process.cwd(), 'apps/frontend/src/components/AllowedBlank.tsx'),
        relativeFile: 'apps/frontend/src/components/AllowedBlank.tsx',
        content: 'export function AllowedBlank() { return <section /> }',
      },
      {
        file: join(process.cwd(), 'apps/frontend/src/pages/LivePage.tsx'),
        relativeFile: 'apps/frontend/src/pages/LivePage.tsx',
        content: "import { AllowedBlank } from '../components/AllowedBlank'\nexport function LivePage() { return <AllowedBlank /> }",
      },
    ]
    const allowlist = new Map([
      ['apps/frontend/src/components/AllowedBlank.tsx', '  '],
      ['apps/frontend/src/components/MissingPanel.tsx', 'เก็บไว้สำหรับทดสอบข้อยกเว้นที่ไฟล์หาย'],
    ])

    const findings = auditReferencedFrontendModules(
      files,
      /^apps\/frontend\/src\/components\/[^/]+\.tsx$/,
      allowlist,
      'component หน้าบ้านไม่ได้ถูก import หรือ mount จาก source อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
    )

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/components/AllowedBlank.tsx',
        line: 1,
        message: 'allowlist ของ frontend static audit ต้องมีเหตุผลชัดเจน',
      },
      {
        file: 'apps/frontend/src/components/MissingPanel.tsx',
        line: 1,
        message: 'allowlist ของ frontend static audit ชี้ไฟล์ที่ไม่มีอยู่จริงหรือไม่ตรงชนิดที่ตรวจ',
      },
    ])
  })

  test('reports unmounted frontend pages that are not wired into routes', async () => {
    const fixtureRoot = join(process.cwd(), 'apps/frontend/src')
    const files = [
      join(fixtureRoot, 'pages/DeadPage.tsx'),
      join(fixtureRoot, 'pages/LivePage.tsx'),
      join(fixtureRoot, 'App.tsx'),
    ]
    const contents = new Map([
      [files[0], 'export function DeadPage() { return <main /> }'],
      [files[1], 'export function LivePage() { return <main /> }'],
      [
        files[2],
        "const loadLivePage = () => import('./pages/LivePage').then((module) => ({ default: module.LivePage }))\n<Route element={<LivePage />} path=\"/live\" />",
      ],
    ])

    const findings = await auditUnmountedFrontendPages(files, async (file) => contents.get(file) ?? '')

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/pages/DeadPage.tsx',
        line: 1,
        message: 'page หน้าบ้านไม่ได้ถูก import หรือ mount จาก App/page อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
      },
    ])
  })

  test('reports Thai placeholder and mojibake text regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>เร็วๆ นี้</p>',
        '<p>broken\uFFFDtext</p>',
        '<p>\u0e40\u0e18\u2022\u0e40\u0e19\u0089องเปิดเมนู</p>',
      ].join('\n'),
      'ThaiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        'พบข้อความไทยแนวเร็วๆนี้ที่เป็นข้อความรอทำ',
        'พบ replacement character อาจเป็น encoding เสีย',
        'พบ C1 control character อาจเป็น mojibake',
        'พบลำดับตัวอักษรไทยที่มักเป็น UTF-8 mojibake',
      ]),
    )
  })

  test('reports English UI label regressions for Thai-first surfaces', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>Prompt Inspector</p>',
        '<span>Admin Health</span>',
        '<InfoLine label="Chat reply budget" value="1200 tokens" />',
        '<h3>Relationship Contract</h3>',
        '<p>Production blocker summary</p>',
        '<h2>Deploy checklist</h2>',
        '<p>Knowledge pack needs check</p>',
        '<p>Production gates</p>',
        '<span>staging/future gate</span>',
        '<p>Could not load chats</p>',
        '<p>Could not load characters</p>',
        '<p>/chat failed with status 500</p>',
        '<p>Teen romance</p>',
        '<p>Mature 18+</p>',
        '<p>Restricted 18+</p>',
        '<p>image provider</p>',
        '<button aria-label="Select chat" />',
      ].join('\n'),
      'EnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(Array.from({ length: 18 }, () => englishUiFinding))
  })

  test('reports mixed English debug copy regressions for Thai-first surfaces', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>prompt-control, relationship state, scene state และ token budget</p>',
        '<h1>ทดสอบคุณภาพ prompt/context</h1>',
        '<p>ระบบ relationship สร้างจังหวะของเรื่อง</p>',
        '<p>ยังไม่ได้ตั้ง anchor ตัวละคร</p>',
        '<p>รัน eval</p>',
        '<p>ยังไม่ได้รัน eval</p>',
        '<p>hook: unfinished business</p>',
        '<p>ยัง fallback เป็นภาพตัวอย่าง</p>',
        '<th>เหตุผล disabled</th>',
        '<p>production ควรตั้งค่า image provider จริง</p>',
        '<p>ใส่รูปเพื่อให้หน้าการ์ดและ Lobby ดูน่ากด</p>',
        '<p>มีแกน prompt สำหรับคุมโทนตัวละคร</p>',
        '<p>ให้ backend ช่วยร่างตัวละคร</p>',
        '<input placeholder="roleplay, thai" />',
        '<span>AI roleplay ภาษาไทย</span>',
      ].join('\n'),
      'MixedEnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      ...Array.from({ length: 6 }, () => englishUiFinding),
      ...Array.from({ length: 6 }, () => creatorMixedFinding),
      ...Array.from({ length: 7 }, () => mixedUiFinding),
    ])
  })

  test('reports mixed Admin Health operational copy regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>backend ยังไม่พร้อมเต็ม ต้องดู checklist ด้านล่าง</p>',
        '<p>ติดต่อ backend health ไม่ได้</p>',
        '<p>รอ health response จาก backend</p>',
        '<p>backend env ไม่มีค่า required ที่ขาด</p>',
        '<p>ล็อกค่า env ชุดนี้ไว้ใน hosting secret manager</p>',
        '<p>แก้ backend host secrets แล้วรัน production:check</p>',
        '<p>waiting for backend health response</p>',
        '<p>ยืนยัน provider จริง</p>',
        '<p>พร้อมสำหรับ final gate แล้ว</p>',
        '<p>เช็ค console error และ mobile overflow</p>',
        '<p>production smoke กับ backend/frontend domain จริง</p>',
        '<p>ไม่มี warning ฝั่ง frontend</p>',
        '<p>ถ้าได้ usage.providerFailure ต้องเช็คคีย์</p>',
        '<p>ถ้าได้ providerFailure ต้องเช็คคีย์</p>',
        '<p>ถ้าเจอ billing/quota limit ต้องเพิ่มวงเงิน</p>',
        '<p>local/dev ยังไม่บังคับ</p>',
        '<p>รันกับ production/staging ให้ผ่าน</p>',
        '<p>รันกับ staging/production ให้ผ่าน</p>',
        '<h1>ตรวจความพร้อมก่อน staging / production</h1>',
        '<p>ยืนยัน live chat smoke แล้ว</p>',
        '<p>ยืนยัน live image smoke แล้ว</p>',
        '<p>เช็คด้วย browser smoke</p>',
        '<p>สรุป blocker production</p>',
        '<p>พร้อมสำหรับ production smoke</p>',
        '<p>รัน production gate ซ้ำ</p>',
        '<p>ก่อน production ต้องเช็ค</p>',
        '<p>build production แล้ว</p>',
      ].join('\n'),
      'AdminHealthFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 28 }, () => adminHealthMixedFinding),
    )
  })

  test('reports mixed prompt and admin tooling wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<Field label="System prompt / บุคลิก" />',
        '<button>รีเซ็ต prompt</button>',
        '<p>คัดลอก redacted prompt แล้ว</p>',
        '<p>Redacted final prompt</p>',
        '<span>Runtime note</span>',
        '<span>Persona override</span>',
        '<span>โน้ต runtime</span>',
        '<span>persona ชั่วคราว</span>',
        '<p>ระบบจะแสดง prompt snapshot และ diff ที่ redact แล้ว</p>',
        '<p>ตรวจพรอมป์ไม่สำเร็จ ลองเช็ค backend</p>',
        '<p>เรียก admin API เพื่อตรวจ snapshot พรอมป์และ diff พรอมป์</p>',
        '<p>frontend domain ทดลอง</p>',
      ].join('\n'),
      'PromptToolingFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 15 }, () => promptToolingMixedFinding),
    )
  })

  test('reports mixed lorebook and persona wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>Lorebook</p>',
        '<StatCard label="Lore ที่ใช้" />',
        '<p>Lore ที่ดึงมาใช้</p>',
        '<p>ไม่มี lore ที่ถูกดึงมาใช้</p>',
        '<p>กำลังโหลด lore...</p>',
        '<button>เพิ่ม lore</button>',
        '<button>แก้ lore</button>',
        '<button>บันทึก lore</button>',
        '<input placeholder="keyword เช่น บ้านเกิด" />',
        '<input placeholder="aliases คั่นด้วย comma" />',
        '<input placeholder="priority" />',
        '<span>Persona ชั่วคราว</span>',
        '<span>แนบ persona ที่บันทึกไว้</span>',
        '<input placeholder="เว้นว่างเพื่อใช้ persona ที่บันทึกไว้" />',
        '<p>ชุดนี้ใช้เป็น visual cue ก่อนต่อ persona expression จริง</p>',
      ].join('\n'),
      'KnowledgePersonaFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 16 }, () => knowledgePersonaMixedFinding),
    )
  })

  test('reports mixed profile and tag helper wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>เปิดโหมดผู้ใหญ่สำหรับเนื้อเรื่องจำลอง/สมมุติ และให้ backend จำกัดตามบัญชี</p>',
        '<p>บันทึกโหมดคอนเทนต์ไม่ได้ กรุณาเช็กการเชื่อมต่อ backend</p>',
        '<p>โดย backend จะจำกัดซ้ำตามบัญชี</p>',
        '<p>พฤติกรรมบอทอาจแกว่งถ้า prompt ไม่ชัด</p>',
        '<p>ยังไม่ใช่ปุ่มในแอปเครื่องนี้ เพราะต้องใช้บัญชีและโดเมนจริง</p>',
      ].join('\n'),
      'ProfileTagFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      [
        ...Array.from({ length: 4 }, () => profileHelperMixedFinding),
        'พบข้อความ staging checklist ที่กำกวมเหมือนปุ่มปลอม',
      ],
    )
  })

  test('combines accessibility and placeholder findings with stable line numbers', () => {
    const content = `
      export function Fixture() {
        return <button onClick={() => {}}><Icon /></button>
      }
    `
    const findings = auditFrontendSourceFile(content, 'Fixture.tsx')

    expect(lineFor(content, content.indexOf('<button'))).toBe(3)
    expect(findings.map((finding) => finding.line)).toEqual([3, 3, 3])
    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ปุ่มไม่มี type ชัดเจน'),
        expect.stringContaining('ปุ่มไอคอนล้วนไม่มี aria-label หรือ title'),
        'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      ]),
    )
  })

  test('runs the committed frontend static audit through an importable runner', async () => {
    const findings = await collectFrontendStaticFindings()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runFrontendStaticAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('ผ่าน - ตรวจ static หน้าบ้านผ่านแล้ว')
    expect(errors).toEqual([])
  })
})
