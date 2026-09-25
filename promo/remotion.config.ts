// 設定の一覧: https://remotion.dev/docs/config
import { Config } from '@remotion/cli/config'

Config.setRspack(true)
Config.setVideoImageFormat('jpeg')
// 画面の文字がにじまないよう、画質を上げる
Config.setJpegQuality(95)
Config.setCrf(16)
Config.setOverwriteOutput(true)
