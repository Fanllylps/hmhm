import type { KanaEntry } from './kana'

/**
 * The 80 JLPT N5 kanji, shaped like kana entries so they slot straight into
 * the SRS, games and writing practice. `romaji` is the most common reading
 * (the one shown and typed), `alt` holds other accepted readings, and
 * `meaning` is shown on the card back.
 */

const k = (
  kana: string,
  romaji: string,
  meaning: string,
  row: string,
  alt: string[] = [],
): KanaEntry => ({
  id: `kj-${kana}`,
  kana,
  romaji,
  alt,
  script: 'kanji',
  group: 'kanji',
  row,
  meaning,
})

export const KANJI: KanaEntry[] = [
  // ---- Numbers ----
  k('一', 'ichi', 'one', 'numbers'),
  k('二', 'ni', 'two', 'numbers'),
  k('三', 'san', 'three', 'numbers'),
  k('四', 'yon', 'four', 'numbers', ['shi']),
  k('五', 'go', 'five', 'numbers'),
  k('六', 'roku', 'six', 'numbers'),
  k('七', 'nana', 'seven', 'numbers', ['shichi']),
  k('八', 'hachi', 'eight', 'numbers'),
  k('九', 'kyuu', 'nine', 'numbers', ['ku']),
  k('十', 'juu', 'ten', 'numbers'),
  k('百', 'hyaku', 'hundred', 'numbers'),
  k('千', 'sen', 'thousand', 'numbers'),
  k('万', 'man', 'ten thousand', 'numbers'),
  k('円', 'en', 'yen · circle', 'numbers'),
  // ---- Time ----
  k('日', 'hi', 'day · sun', 'time', ['nichi', 'bi']),
  k('月', 'tsuki', 'month · moon', 'time', ['getsu', 'gatsu', 'tuki']),
  k('年', 'toshi', 'year', 'time', ['nen', 'tosi']),
  k('時', 'ji', 'time · hour', 'time', ['toki', 'zi']),
  k('分', 'fun', 'minute · part', 'time', ['pun', 'bun', 'hun']),
  k('間', 'aida', 'between · interval', 'time', ['kan', 'ma']),
  k('今', 'ima', 'now', 'time', ['kon']),
  k('先', 'saki', 'ahead · previous', 'time', ['sen']),
  k('前', 'mae', 'front · before', 'time', ['zen']),
  k('後', 'ato', 'after · behind', 'time', ['go', 'ushiro', 'usiro']),
  k('午', 'go', 'noon', 'time'),
  k('半', 'han', 'half', 'time'),
  k('毎', 'mai', 'every', 'time'),
  // ---- Nature ----
  k('山', 'yama', 'mountain', 'nature', ['san']),
  k('川', 'kawa', 'river', 'nature', ['sen']),
  k('水', 'mizu', 'water', 'nature', ['sui', 'midu']),
  k('火', 'hi', 'fire', 'nature', ['ka']),
  k('木', 'ki', 'tree · wood', 'nature', ['moku']),
  k('金', 'kane', 'money · gold', 'nature', ['kin']),
  k('土', 'tsuchi', 'earth · soil', 'nature', ['do', 'tuchi', 'tuti']),
  k('天', 'ten', 'heaven · sky', 'nature'),
  k('気', 'ki', 'spirit · energy', 'nature', ['ke']),
  k('雨', 'ame', 'rain', 'nature', ['u']),
  k('電', 'den', 'electricity', 'nature'),
  // ---- People ----
  k('人', 'hito', 'person', 'people', ['jin', 'nin']),
  k('男', 'otoko', 'man', 'people', ['dan']),
  k('女', 'onna', 'woman', 'people', ['jo', 'onago']),
  k('子', 'ko', 'child', 'people', ['shi', 'si']),
  k('父', 'chichi', 'father', 'people', ['fu', 'tou', 'titi']),
  k('母', 'haha', 'mother', 'people', ['bo', 'kaa']),
  k('友', 'tomo', 'friend', 'people', ['yuu']),
  k('名', 'na', 'name', 'people', ['mei']),
  k('生', 'sei', 'life · birth', 'people', ['nama', 'ikiru', 'umareru']),
  // ---- Verbs ----
  k('行', 'iku', 'go', 'verbs', ['kou', 'gyou']),
  k('来', 'kuru', 'come', 'verbs', ['rai']),
  k('見', 'miru', 'see · look', 'verbs', ['ken']),
  k('聞', 'kiku', 'hear · ask', 'verbs', ['bun']),
  k('読', 'yomu', 'read', 'verbs', ['doku']),
  k('書', 'kaku', 'write', 'verbs', ['sho', 'syo']),
  k('話', 'hanasu', 'speak · talk', 'verbs', ['wa', 'hanashi', 'hanasi']),
  k('食', 'taberu', 'eat', 'verbs', ['shoku', 'syoku']),
  k('出', 'deru', 'go out · leave', 'verbs', ['shutsu', 'dasu', 'de']),
  k('入', 'hairu', 'enter', 'verbs', ['iru', 'nyuu', 'ireru']),
  k('学', 'gaku', 'study · learning', 'verbs', ['manabu']),
  k('休', 'yasumu', 'rest', 'verbs', ['kyuu', 'yasumi']),
  // ---- Position ----
  k('上', 'ue', 'up · above', 'position', ['jou', 'agaru', 'uwa']),
  k('下', 'shita', 'down · below', 'position', ['ka', 'ge', 'kudaru', 'sita']),
  k('中', 'naka', 'inside · middle', 'position', ['chuu', 'tyuu']),
  k('外', 'soto', 'outside', 'position', ['gai', 'hoka']),
  k('左', 'hidari', 'left', 'position', ['sa']),
  k('右', 'migi', 'right', 'position', ['u', 'yuu']),
  k('東', 'higashi', 'east', 'position', ['tou', 'higasi']),
  k('西', 'nishi', 'west', 'position', ['sei', 'sai', 'nisi']),
  k('南', 'minami', 'south', 'position', ['nan']),
  k('北', 'kita', 'north', 'position', ['hoku']),
  // ---- Description ----
  k('大', 'dai', 'big', 'description', ['ookii', 'oo', 'tai']),
  k('小', 'chiisai', 'small', 'description', ['shou', 'ko', 'tiisai']),
  k('長', 'nagai', 'long · chief', 'description', ['chou', 'tyou']),
  k('高', 'takai', 'tall · expensive', 'description', ['kou']),
  k('白', 'shiro', 'white', 'description', ['haku', 'siro']),
  // ---- Things ----
  k('国', 'kuni', 'country', 'things', ['koku']),
  k('校', 'kou', 'school', 'things'),
  k('本', 'hon', 'book · origin', 'things', ['moto']),
  k('車', 'kuruma', 'car', 'things', ['sha', 'sya']),
  k('語', 'go', 'language · word', 'things', ['kataru']),
  k('何', 'nani', 'what', 'things', ['nan']),
]

export const KANJI_BY_ID: Record<string, KanaEntry> = Object.fromEntries(
  KANJI.map((e) => [e.id, e]),
)
