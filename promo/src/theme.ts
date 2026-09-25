import { loadFont } from '@remotion/google-fonts/NotoSansJP'

// 日本語のフォントは文字の範囲ごとに分かれていて、読み込むファイルが多い（2 つの太さで約 240）
export const { fontFamily } = loadFont('normal', {
  weights: ['500', '800'],
  subsets: ['japanese', 'latin'],
  ignoreTooManyRequestsWarning: true,
})

// アプリ（src/index.css）の Node の種類の色
export const TYPE_COLORS = {
  requirement: '#7c3aed',
  api: '#d97706',
  usecase: '#2563eb',
  entity: '#059669',
  database: '#475569',
  external: '#db2777',
}

export const APP_URL = 'yodeff.github.io/ArchitectureCreator'
