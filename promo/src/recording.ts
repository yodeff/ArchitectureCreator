// scripts/record.mjs が書き出す録画の記録（場面の時刻・カーソルの軌跡・クリック）。時刻は録画の先頭からの秒
import data from './recording.json'

export type SceneId = keyof typeof data.scenes

export const recording = data

// 場面の長さ（フレーム数）。録画の先頭から数えた開始フレームも返す
export function sceneFrames(scene: SceneId, fps: number) {
  const { start, end } = data.scenes[scene]
  const from = Math.round(start * fps)
  return { from, duration: Math.round(end * fps) - from }
}

// 場面の中で n 番目のクリックの時刻（場面の先頭からの秒）
export function clickTime(scene: SceneId, n: number): number {
  const { start, end } = data.scenes[scene]
  const inScene = data.clicks.filter((c) => c.t >= start && c.t <= end)
  if (!inScene[n]) throw new Error(`${scene} に ${n} 番目のクリックがありません`)
  return inScene[n].t - start
}

export function cursorAt(t: number): { x: number; y: number } {
  const track = data.cursor
  if (t <= track[0].t) return track[0]
  if (t >= track[track.length - 1].t) return track[track.length - 1]
  let lo = 0
  let hi = track.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (track[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = track[lo]
  const b = track[hi]
  const p = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t)
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }
}
