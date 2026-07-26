import { describe, expect, it } from 'vitest'
import { parseStoryImport } from './storyImport'

const STORY = {
  title: 'いぬの ゆめ',
  titleEn: "A Dog's Dream",
  titleId: 'Mimpi Anjing',
  level: 'easy',
  sentences: [
    { jp: 'いぬが ねます。', romaji: 'inu ga nemasu', en: 'The dog sleeps.', id: 'Anjing itu tidur.' },
    { jp: 'ゆめを みます。', romaji: 'yume o mimasu', en: 'It dreams.', id: 'Ia bermimpi.' },
  ],
}

describe('parseStoryImport', () => {
  it('parses a single story object', () => {
    const { stories, invalid } = parseStoryImport(JSON.stringify(STORY))
    expect(stories).toHaveLength(1)
    expect(invalid).toBe(0)
    expect(stories[0].title).toBe('いぬの ゆめ')
    expect(stories[0].sentences).toHaveLength(2)
    expect(stories[0].sentences[0].idn).toBe('Anjing itu tidur.')
  })

  it('parses an array of stories inside markdown fences', () => {
    const noisy = 'Here you go!\n```json\n' + JSON.stringify([STORY, STORY]) + '\n```'
    expect(parseStoryImport(noisy).stories).toHaveLength(2)
  })

  it('skips broken sentences and stories', () => {
    const mixed = JSON.stringify([
      STORY,
      { title: 'broken', sentences: [{ jp: 'only-jp' }] },
      { notAStory: true },
    ])
    const { stories, invalid } = parseStoryImport(mixed)
    expect(stories).toHaveLength(1)
    expect(invalid).toBe(2)
  })

  it('defaults level and falls back titles', () => {
    const minimal = JSON.stringify({
      title: 'はる',
      sentences: [{ jp: 'はるです。', en: 'It is spring.', id: 'Sekarang musim semi.' }],
    })
    const story = parseStoryImport(minimal).stories[0]
    expect(story.level).toBe('easy')
    expect(story.titleEn).toBe('はる')
    expect(story.sentences[0].romaji).toBe('')
  })

  it('throws typed errors', () => {
    expect(() => parseStoryImport('no json here')).toThrowError('no-json')
    expect(() => parseStoryImport('{ broken }')).toThrowError('invalid-json')
    expect(() => parseStoryImport('[{"title":"x","sentences":[]}]')).toThrowError('empty')
  })
})
