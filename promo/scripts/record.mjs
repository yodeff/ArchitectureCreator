// アプリを実際に操作して録画する。
// 1440x810 の画面を 4/3 倍（1920x1080）で連続して撮り、ffmpeg で 30fps の動画にする。
// カーソルは画面に映らないので、動かした座標とクリックを記録し、動画側（Remotion）で描く。
//
// 使い方: アプリを起動してから（リポジトリ直下で npm run dev）、promo で npm run record
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'
const VIEWPORT = { width: 1440, height: 810 }
const SCALE = 4 / 3
const FRAMES_DIR = 'recording-frames'
const VIDEO_PATH = 'public/app.mp4'
const TIMELINE_PATH = 'src/recording.json'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: 'ja-JP' })
const page = await context.newPage()
await page.goto(APP_URL)
await page.waitForSelector('.react-flow__node')

// サンプルを整列した状態から始める
await page.getByRole('button', { name: 'Auto Layout' }).click()
await sleep(800)

// ---- 撮影 ----

rmSync(FRAMES_DIR, { recursive: true, force: true })
mkdirSync(FRAMES_DIR)
const cdp = await context.newCDPSession(page)
const frames = []
let capturing = true
const captureLoop = (async () => {
  while (capturing) {
    const t = Date.now()
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 95,
      optimizeForSpeed: true,
      clip: { x: 0, y: 0, ...VIEWPORT, scale: SCALE },
    })
    const file = `${String(frames.length).padStart(5, '0')}.jpg`
    writeFileSync(join(FRAMES_DIR, file), Buffer.from(data, 'base64'))
    frames.push({ t, file })
  }
})()

// ---- カーソルと場面の記録 ----

let cursor = { x: 1100, y: 620 }
const cursorTrack = [{ t: Date.now(), ...cursor }]
const clicks = []
const scenes = {}

async function moveTo({ x, y }, ms = 600) {
  const from = { ...cursor }
  const start = Date.now()
  // 動き出す前の位置も残す。止まっている間に、動画側でカーソルがずれていかないように
  cursorTrack.push({ t: start, ...from })
  const steps = Math.max(2, Math.round(ms / 16))
  for (let i = 1; i <= steps; i++) {
    const p = easeInOut(i / steps)
    cursor = { x: from.x + (x - from.x) * p, y: from.y + (y - from.y) * p }
    await page.mouse.move(cursor.x, cursor.y)
    cursorTrack.push({ t: Date.now(), ...cursor })
    const wait = start + (ms * i) / steps - Date.now()
    if (wait > 0) await sleep(wait)
  }
}

async function click(point, ms) {
  await moveTo(point, ms)
  clicks.push({ t: Date.now(), ...cursor })
  await page.mouse.down()
  await sleep(60)
  await page.mouse.up()
}

async function scene(name, actions) {
  const start = Date.now()
  await actions()
  scenes[name] = { start, end: Date.now() }
}

async function centerOf(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`見つかりません: ${locator}`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// Canvas のうち Node も線もない場所（選択を外すときや、表示位置をずらすときに使う）。左端から minX 以上離れた所を探す
async function emptyPanePoint(minX = 200) {
  const point = await page.evaluate((minX) => {
    const pane = document.querySelector('.react-flow__pane').getBoundingClientRect()
    for (let y = pane.bottom - 60; y > pane.top + 60; y -= 20) {
      for (let x = pane.left + minX; x < pane.right - 60; x += 20) {
        if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y }
      }
    }
    return null
  }, minX)
  if (!point) throw new Error('Canvas に空いている場所がありません')
  return point
}

const node = (id) => page.locator(`.react-flow__node[data-id="${id}"]`)
const button = (name) => page.getByRole('button', { name, exact: true })

await page.mouse.move(cursor.x, cursor.y)

// ---- 場面 ----

await scene('overview', async () => {
  await sleep(4000)
})

await scene('add', async () => {
  await click(await centerOf(button('+ Add Node')), 800)
  await sleep(500)
  const typeSelect = page.locator('.panel select')
  // ネイティブの選択肢の一覧は撮れないので、クリックの見た目だけ出して値を選ぶ
  await moveTo(await centerOf(typeSelect), 500)
  clicks.push({ t: Date.now(), ...cursor })
  await sleep(150)
  await typeSelect.selectOption('external')
  await sleep(700)
  await click(await centerOf(page.locator('.panel input').first()), 450)
  await page.keyboard.type('在庫サービス', { delay: 110 })
  await sleep(300)
  await click(await centerOf(button('Add')), 500)
  await sleep(1200)
})

await click(await centerOf(button('Close')), 400)
await sleep(600)

await scene('connect', async () => {
  const added = page.locator('.react-flow__node', { hasText: '在庫サービス' })
  await moveTo(await centerOf(node('uc-create-order').locator('.react-flow__handle.source')), 800)
  await sleep(150)
  clicks.push({ t: Date.now(), ...cursor })
  await page.mouse.down()
  await moveTo(await centerOf(added.locator('.react-flow__handle.target')), 1300)
  await sleep(150)
  await page.mouse.up()
  await sleep(1300)
})

await scene('layout', async () => {
  await click(await centerOf(button('Auto Layout')), 900)
  await sleep(1800)
})

// Node を選ぶと右に編集パネルが開き、Canvas が狭くなる。右の列がミニマップに隠れないよう、グラフを左へずらしておく
const panFrom = await emptyPanePoint(400)
await moveTo(panFrom, 300)
await page.mouse.down()
await moveTo({ x: panFrom.x - 250, y: panFrom.y }, 500)
await page.mouse.up()
await sleep(300)

await scene('flow', async () => {
  await click(await centerOf(node('uc-create-order')), 900)
  await sleep(3200)
})

await click(await emptyPanePoint(), 500)
await sleep(500)

await scene('legend', async () => {
  await click(await centerOf(page.locator('.legend summary')), 900)
  // 開いた凡例は左へ広がり、カーソルが文字に重なるので、凡例の外へよける
  await sleep(200)
  const legend = await page.locator('.legend').boundingBox()
  await moveTo({ x: legend.x - 40, y: legend.y + legend.height + 40 }, 600)
  await sleep(2400)
})

await click(await centerOf(page.locator('.legend summary')), 400)
await sleep(400)

await scene('views', async () => {
  await click(await centerOf(button('Use Cases')), 800)
  await sleep(1500)
  await click(await centerOf(button('Database')), 500)
  await sleep(1800)
})

// ---- 書き出し ----

capturing = false
await captureLoop
await browser.close()

const t0 = frames[0].t
const sec = (t) => Math.round((t - t0)) / 1000
const lastT = frames.at(-1).t

// フレームごとの表示時間を並べ、ffmpeg で一定の 30fps にする
const list = frames
  .map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? lastT + 50) - f.t) / 1000}`)
  .join('\n')
writeFileSync(join(FRAMES_DIR, 'list.txt'), `${list}\nfile '${frames.at(-1).file}'\n`)
mkdirSync('public', { recursive: true })
execFileSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(FRAMES_DIR, 'list.txt'),
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', VIDEO_PATH],
  { stdio: 'inherit' },
)

const timeline = {
  viewport: VIEWPORT,
  duration: sec(lastT + 50),
  scenes: Object.fromEntries(Object.entries(scenes).map(([k, v]) => [k, { start: sec(v.start), end: sec(v.end) }])),
  cursor: cursorTrack.map((p) => ({ t: Math.max(0, sec(p.t)), x: Math.round(p.x), y: Math.round(p.y) })),
  clicks: clicks.map((c) => ({ t: sec(c.t), x: Math.round(c.x), y: Math.round(c.y) })),
}
writeFileSync(TIMELINE_PATH, JSON.stringify(timeline, null, 1))
rmSync(FRAMES_DIR, { recursive: true, force: true })

const fps = frames.length / ((lastT - t0) / 1000)
console.log(`${frames.length} frames (${fps.toFixed(1)} fps) → ${VIDEO_PATH} (${timeline.duration}s)`)
console.log(timeline.scenes)
