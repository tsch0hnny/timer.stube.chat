<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugLog } from '~/composables/useDebugLog'
import { useDebugOverlay } from '~/composables/useSecretTaps'

const timer = useStageTimer()
const { events } = useDebugLog()
const { close } = useDebugOverlay()
const version = useRuntimeConfig().public.appVersion as string
const pwa = useNuxtApp().$pwa

const visibility = ref(document.visibilityState)
const sw = ref<{ controlled: boolean; state: string; scope: string }>({ controlled: false, state: '?', scope: '?' })
const insets = ref('')
const stage = ref('')
const units = ref('')
const copied = ref('')
const probe = ref<HTMLElement | null>(null)

const iso = (t: number) => new Date(t).toISOString()
const hms = (t: number) => new Date(t).toLocaleTimeString([], { hour12: false })
const displayMode = () => ['fullscreen', 'standalone', 'minimal-ui', 'browser'].filter((m) => matchMedia(`(display-mode: ${m})`).matches).join('+')

const stored = computed(() => {
  timer.state.value // re-read whenever the state changes
  const raw = timer.store.rawTimer()
  if (!raw) return { raw: '(nothing stored)', decoded: '' }
  try {
    const o = JSON.parse(raw)
    const s = o.state ?? {}
    const decoded = [
      o.savedAt && `savedAt ${iso(o.savedAt)}`,
      s.endAt && `endAt ${iso(s.endAt)} (${Math.round((s.endAt - timer.now.value) / 1000)} s from now)`,
      s.remainingMs !== undefined && `remainingMs ${s.remainingMs}`,
    ].filter(Boolean).join('\n')
    return { raw, decoded }
  } catch {
    return { raw, decoded: 'unreadable' }
  }
})

async function refresh() {
  visibility.value = document.visibilityState
  const reg = await navigator.serviceWorker?.getRegistration()
  sw.value = {
    controlled: !!navigator.serviceWorker?.controller,
    state: reg ? (reg.active?.state ?? 'none') + (reg.waiting ? ' · update waiting' : '') : 'not registered',
    scope: reg?.scope ?? '–',
  }
  if (probe.value) {
    const p = getComputedStyle(probe.value)
    insets.value = [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft].map((x) => parseFloat(x)).join(' / ')
  }
  // Should equal the viewport (the screen, in the home-screen app); see .stage in TimerView.vue.
  const r = document.querySelector('[data-testid="timer-view"], [data-testid="presets"]')?.getBoundingClientRect()
  const de = document.documentElement
  stage.value = r ? `${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)} · layout viewport ${de.clientWidth}×${de.clientHeight}` : '–'
  const hs = [...document.querySelectorAll<HTMLElement>('.unit-probe')].map((el) => el.offsetHeight).join(' / ')
  units.value = `vh/dvh/svh/lvh ${hs} · --app-h ${de.style.getPropertyValue('--app-h') || 'unset (100dvh)'}`
}
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => { void refresh(); interval = setInterval(refresh, 1000); document.addEventListener('visibilitychange', refresh) })
onBeforeUnmount(() => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh) })

const rows = computed((): Array<[string, string]> => [
  ['version', version],
  ['now', `${iso(timer.now.value)} (local ${hms(timer.now.value)})`],
  ['phase', `${timer.phase.value}${timer.display.value ? ' · ' + timer.display.value.text : ''}`],
  ['wake lock', `${timer.wakeLock.status.value}${timer.wakeLock.error.value ? ' · ' + timer.wakeLock.error.value : ''}`],
  ['visibility', visibility.value],
  ['display-mode', `${displayMode()} · standalone=${String((navigator as Navigator & { standalone?: boolean }).standalone)}`],
  ['viewport', `${innerWidth}×${innerHeight} · screen ${screen.width}×${screen.height} · safe t/r/b/l ${insets.value}`],
  ['stage', stage.value],
  ['units', units.value],
  ['service worker', `${sw.value.state} · controlled=${sw.value.controlled} · update ready=${!!pwa?.needRefresh}`],
  ['online', String(navigator.onLine)],
  ['storage', timer.storageError.value ?? 'ok'],
  ['step', `${timer.prefs.value.stepMinutes} min`],
])

async function copy() {
  const text = [
    ...rows.value.map(([k, v]) => `${k}: ${v}`),
    `stored: ${stored.value.raw}`,
    stored.value.decoded,
    'events:',
    ...events.value.slice(0, 80).map((e) => `${iso(e.t)} ${e.type} ${e.detail}`),
  ].join('\n')
  try { await navigator.clipboard.writeText(text); copied.value = 'Copied' }
  catch { copied.value = 'Copy failed: select the text below'; console.log(text) }
}
</script>

<template>
  <aside class="debug" role="dialog" aria-label="Debug information" data-testid="debug">
    <header class="head">
      <h2>Debug</h2>
      <span class="copied">{{ copied }}</span>
      <button type="button" data-testid="debug-copy" @click="copy">Copy</button>
      <button type="button" data-testid="debug-close" @click="close">Close</button>
    </header>
    <dl>
      <template v-for="[k, v] in rows" :key="k">
        <dt>{{ k }}</dt><dd :data-testid="`debug-${k.replace(/\s+/g, '-')}`">{{ v }}</dd>
      </template>
      <dt>stored</dt>
      <dd data-testid="debug-stored"><code>{{ stored.raw }}</code><pre v-if="stored.decoded">{{ stored.decoded }}</pre></dd>
    </dl>
    <div ref="probe" class="probe" aria-hidden="true" />
    <div v-for="u in ['vh', 'dvh', 'svh', 'lvh']" :key="u" class="unit-probe" :style="{ height: `100${u}` }" aria-hidden="true" />
    <h3>Events</h3>
    <ol class="events">
      <li v-for="e in events.slice(0, 120)" :key="e.t + e.type + e.detail"><time>{{ hms(e.t) }}</time> <b>{{ e.type }}</b> {{ e.detail }}</li>
    </ol>
  </aside>
</template>

<style scoped>
.debug {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: auto;
  padding: calc(env(safe-area-inset-top) + 0.75rem) calc(env(safe-area-inset-right) + 0.75rem) calc(env(safe-area-inset-bottom) + 1.5rem) calc(env(safe-area-inset-left) + 0.75rem);
  background: rgb(0 0 0 / 0.94);
  color: #fff;
  font: 0.8125rem / 1.4 ui-monospace, Menlo, monospace;
  -webkit-user-select: text;
  user-select: text;
}
.head { position: sticky; top: 0; display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.5rem; background: #000; }
h2 { margin: 0 auto 0 0; font-size: 1rem; }
h3 { margin: 1.25rem 0 0.4rem; font-size: 0.8125rem; color: var(--dim); text-transform: uppercase; letter-spacing: 0.04em; }
.head button { padding: 0.5rem 0.8rem; border-radius: 0.6rem; border: 1px solid #48484a; background: #1c1c1e; color: #fff; font: inherit; }
.copied { color: var(--ok); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.2rem 0.75rem; margin: 0; }
dt { color: var(--dim); }
dd { margin: 0; overflow-wrap: anywhere; }
pre, code { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
.unit-probe { position: fixed; top: 0; left: 0; width: 0; visibility: hidden; pointer-events: none; }
.probe { position: absolute; visibility: hidden; pointer-events: none; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
.events { margin: 0; padding: 0; list-style: none; }
.events time { color: var(--dim); }
</style>
