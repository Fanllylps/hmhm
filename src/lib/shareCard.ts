import type { Lang } from '../stores/store'

/**
 * Draws a shareable 1080×1350 progress card on a canvas and hands it to the
 * native share sheet (or downloads it where Web Share can't take files).
 */

export interface ShareCardData {
  level: number
  rankTitle: string
  jpTitle: string
  totalXp: number
  streak: number
  mastered: number
  totalCards: number
}

const TXT = {
  en: {
    tagline: 'learning hiragana & katakana',
    level: 'LEVEL',
    streak: (n: number) => `${n} day streak`,
    mastered: (n: number, total: number) => `${n} / ${total} mastered`,
    xp: (n: number) => `${n.toLocaleString('en-US')} XP`,
  },
  id: {
    tagline: 'belajar hiragana & katakana',
    level: 'LEVEL',
    streak: (n: number) => `runtutan ${n} hari`,
    mastered: (n: number, total: number) => `${n} / ${total} dikuasai`,
    xp: (n: number) => `${n.toLocaleString('id-ID')} XP`,
  },
} satisfies Record<Lang, unknown>

const KANA_FONT = '"Zen Maru Gothic", "Hiragino Sans", sans-serif'
const UI_FONT = 'Inter, system-ui, sans-serif'

export async function drawShareCard(data: ShareCardData, lang: Lang): Promise<Blob> {
  // Make sure the webfonts are usable inside the canvas.
  await document.fonts.ready.catch(() => {})

  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const t = TXT[lang]

  // washi background + faint giant glyph
  ctx.fillStyle = '#FAF6ED'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(234, 226, 211, 0.55)'
  ctx.font = `700 620px ${KANA_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('学', W - 200, H - 240)

  // header: app mark
  ctx.strokeStyle = '#D0491F'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(W / 2, 170, 62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#D0491F'
  ctx.font = `700 60px ${KANA_FONT}`
  ctx.fillText('か', W / 2, 176)
  ctx.fillStyle = '#26231D'
  ctx.font = `600 52px ${UI_FONT}`
  ctx.fillText('KanaFlow', W / 2, 300)
  ctx.fillStyle = '#8F887A'
  ctx.font = `400 32px ${UI_FONT}`
  ctx.fillText(t.tagline, W / 2, 352)

  // level ring
  ctx.strokeStyle = '#D0491F'
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.arc(W / 2, 620, 170, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#8F887A'
  ctx.font = `600 34px ${UI_FONT}`
  ctx.fillText(t.level, W / 2, 512)
  ctx.fillStyle = '#26231D'
  ctx.font = `700 190px ${UI_FONT}`
  ctx.fillText(String(data.level), W / 2, 646)

  // rank
  ctx.fillStyle = '#26231D'
  ctx.font = `600 58px ${UI_FONT}`
  ctx.fillText(data.rankTitle, W / 2, 880)
  ctx.fillStyle = '#D0491F'
  ctx.font = `700 44px ${KANA_FONT}`
  ctx.fillText(data.jpTitle, W / 2, 946)

  // stat row
  const stats = [
    { jp: '炎', text: t.streak(data.streak) },
    { jp: '習', text: t.mastered(data.mastered, data.totalCards) },
    { jp: '仙', text: t.xp(data.totalXp) },
  ]
  const rowY = 1090
  const colW = W / 3
  stats.forEach((s, i) => {
    const x = colW * i + colW / 2
    ctx.fillStyle = '#D0491F'
    ctx.font = `700 54px ${KANA_FONT}`
    ctx.fillText(s.jp, x, rowY)
    ctx.fillStyle = '#26231D'
    ctx.font = `500 30px ${UI_FONT}`
    ctx.fillText(s.text, x, rowY + 62)
  })

  // hairline + date footer
  ctx.strokeStyle = '#EAE2D3'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(120, 1220)
  ctx.lineTo(W - 120, 1220)
  ctx.stroke()
  ctx.fillStyle = '#8F887A'
  ctx.font = `400 28px ${UI_FONT}`
  ctx.fillText(
    new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    W / 2,
    1274,
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

/** Share via the native sheet when possible, otherwise download the PNG. */
export async function shareProgressCard(
  data: ShareCardData,
  lang: Lang,
): Promise<'shared' | 'downloaded'> {
  const blob = await drawShareCard(data, lang)
  const file = new File([blob], 'kanaflow-progress.png', { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch {
      // User cancelled or share failed — fall through to download? Cancelling
      // shouldn't force a download, so just report as shared-attempt.
      return 'shared'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kanaflow-progress.png'
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
