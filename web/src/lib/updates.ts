// GitHub Pages caches index.html for 10 minutes (max-age=600) and iOS home-screen apps honour that,
// so a relaunch can keep running the old build. We poll a tiny version.json with no-store instead,
// and when a newer build exists we refresh the cached index.html and reload.
const ATTEMPT_KEY = 'll_update_attempt'

async function check() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { build } = (await res.json()) as { build?: string }
    if (!build || build === __BUILD_ID__) return

    // Don't yank the page out from under someone who is typing; we check again on next foreground.
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

    // One attempt per remote build per session, so a lagging CDN can't cause a reload loop.
    if (sessionStorage.getItem(ATTEMPT_KEY) === build) return
    sessionStorage.setItem(ATTEMPT_KEY, build)

    await fetch(window.location.pathname, { cache: 'reload' }) // replaces the stale cached index.html
    window.location.reload()
  } catch {
    /* offline, or storage unavailable: keep running the current build */
  }
}

export function startUpdateChecks() {
  void check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
}
