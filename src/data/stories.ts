/**
 * Short reading passages in kana. Every sentence carries romaji plus English
 * and Indonesian translations, revealed per line in the reader.
 */

export interface StorySentence {
  jp: string
  romaji: string
  en: string
  idn: string
}

export interface Story {
  id: string
  /** Japanese title (kana). */
  title: string
  titleEn: string
  titleId: string
  level: 'easy' | 'medium'
  sentences: StorySentence[]
}

const s = (jp: string, romaji: string, en: string, idn: string): StorySentence => ({
  jp,
  romaji,
  en,
  idn,
})

export const STORIES: Story[] = [
  {
    id: 'st-ねこのいちにち',
    title: 'ねこの いちにち',
    titleEn: "A Cat's Day",
    titleId: 'Sehari Bersama Kucing',
    level: 'easy',
    sentences: [
      s('あさ、ねこが おきます。', 'asa, neko ga okimasu', 'In the morning, the cat wakes up.', 'Pagi hari, kucing itu bangun.'),
      s('ねこは ごはんを たべます。', 'neko wa gohan o tabemasu', 'The cat eats its food.', 'Kucing itu makan makanannya.'),
      s('それから、そとに いきます。', 'sorekara, soto ni ikimasu', 'Then, it goes outside.', 'Setelah itu, ia pergi ke luar.'),
      s('にわで とりを みます。', 'niwa de tori o mimasu', 'It watches birds in the garden.', 'Ia melihat burung di halaman.'),
      s('ひるは まどの したで ねます。', 'hiru wa mado no shita de nemasu', 'At noon, it sleeps under the window.', 'Siang hari, ia tidur di bawah jendela.'),
      s('よる、うちに かえります。', 'yoru, uchi ni kaerimasu', 'At night, it comes back home.', 'Malam hari, ia pulang ke rumah.'),
      s('ねこの いちにちは たのしいです。', 'neko no ichinichi wa tanoshii desu', "The cat's day is fun.", 'Hari si kucing menyenangkan.'),
    ],
  },
  {
    id: 'st-わたしのあさ',
    title: 'わたしの あさ',
    titleEn: 'My Morning',
    titleId: 'Pagiku',
    level: 'easy',
    sentences: [
      s('まいあさ、ろくじに おきます。', 'maiasa, rokuji ni okimasu', 'Every morning, I wake up at six.', 'Setiap pagi, aku bangun jam enam.'),
      s('みずを のみます。', 'mizu o nomimasu', 'I drink water.', 'Aku minum air.'),
      s('それから、パンを たべます。', 'sorekara, pan o tabemasu', 'Then I eat bread.', 'Lalu aku makan roti.'),
      s('コーヒーも のみます。', 'koohii mo nomimasu', 'I drink coffee too.', 'Aku juga minum kopi.'),
      s('しちじに いえを でます。', 'shichiji ni ie o demasu', 'I leave the house at seven.', 'Aku keluar rumah jam tujuh.'),
      s('でんしゃで がっこうに いきます。', 'densha de gakkou ni ikimasu', 'I go to school by train.', 'Aku pergi ke sekolah naik kereta.'),
    ],
  },
  {
    id: 'st-こうえんで',
    title: 'こうえんで',
    titleEn: 'At the Park',
    titleId: 'Di Taman',
    level: 'medium',
    sentences: [
      s('にちようびに こうえんに いきました。', 'nichiyoubi ni kouen ni ikimashita', 'On Sunday, I went to the park.', 'Hari Minggu, aku pergi ke taman.'),
      s('てんきが とても よかったです。', 'tenki ga totemo yokatta desu', 'The weather was very good.', 'Cuacanya sangat bagus.'),
      s('ともだちと サッカーを しました。', 'tomodachi to sakkaa o shimashita', 'I played soccer with my friends.', 'Aku bermain sepak bola dengan teman-teman.'),
      s('おひるに おにぎりを たべました。', 'ohiru ni onigiri o tabemashita', 'At lunch, we ate rice balls.', 'Saat makan siang, kami makan onigiri.'),
      s('さくらが きれいでした。', 'sakura ga kirei deshita', 'The cherry blossoms were beautiful.', 'Bunga sakuranya indah.'),
      s('とても たのしい いちにちでした。', 'totemo tanoshii ichinichi deshita', 'It was a really fun day.', 'Hari itu sangat menyenangkan.'),
    ],
  },
]
