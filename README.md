# 续语传心 · SecondVoice

**写下一句话，让它替你说出来。念的时候可以继续改，随时打断，随时重说。**

在线用：<https://le3334515-tech.github.io/xuyu-chuanxin/>

中英双语，右上角一键切换。纯前端、无后端、无密钥 —— 文字不出你的设备。

## 从哪来的

结构、交互与视觉来自 [taranggoyal70/secondvoice](https://github.com/taranggoyal70/secondvoice)（MIT，AssemblyAI *Hack into Speech* 获奖作品）。那份作品只支持英文，发声走 AssemblyAI 的云端 TTS。

这一版把它做成中文可用：

| | 原版 | 续语传心 |
|---|---|---|
| 界面语言 | English | 中文 / English 可切换 |
| 发声 | AssemblyAI 流式 TTS（需 API key） | 本机语音合成（免密钥） |
| 逐词高亮 | 服务端返回词边界 | 中文分词 + 朗读边界重算 |
| 听一个问题 | AssemblyAI 流式转写 | 浏览器语音识别 |
| 回复建议 | AI 网关生成 | 本地按问句类型生成三句 |
| 部署 | Vercel（服务端） | 纯静态导出，任意托管 |
| 示例录音 | 英文预录 | 中英各一套预录（含词时间轴） |

**为什么换掉发声引擎**：实测原版接入的 AssemblyAI TTS，`language` 支持集是
`english / french / german / italian / portuguese / spanish` —— 不含中文；
用 `english` 强行念中文时整句只回一个词边界，逐词高亮随之失效。
所以中文侧改用设备自带音色，并用分词把边界补回来。

## 与原版一致的部分（逐项核对过）

**结构与排版**沿用原版 DOM 与类名，没有重画：

- `demo-top` / `choreography-toolbar` / `chapter-switch` / `choreography-stage` / `choreography-actions`
- 工作室：`01 写下来` + `02 播放` 双栏，`panel-index`、`editor-card`、`output-card`、`phrase-section`、`saved-section`、`history-section`、`session-details`
- 顶栏：文字大小 / 对比度 / 关于；移动端 `mobile-playback` 固定条；`listener-dialog` 大字弹窗

**行为**逐条对齐：

1. 草稿（draft）与正在念的那一版（utterance）是两件事：念的时候可以继续写下一句
2. **Stop 是真取消** —— 取消语音队列并作废回调，不是改个标签
3. **Revise 保留上一版** —— 词级 LCS 比对，`ins` / `del` 着色 + 增删计数
4. 记录里区分「已念完 / 被打断」，打断的会记下念到哪儿
5. 短语库：12 条上限、去重、只存本机
6. 试听不改动草稿；离线时按钮降级但文字仍可显示
7. `⌘/Ctrl + ↵` 念出来 · `Esc` 停止 · 页面隐藏即暂停
8. 示例录音三章节：念出来 → 打断 → 修订，可切四种视觉动效
9. 听一个问题 → 三条可选回复 → Speak / Edit，`Give me a moment` 直接念一句
10. 高对比与大字两套可访问性模式

## 本地跑

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 out/
npm test           # 分词与修订比对
```

子路径部署（GitHub Pages 项目页）时设置前缀：

```bash
NEXT_PUBLIC_BASE_PATH=/xuyu-chuanxin npm run build
```

## 目录

```
app/                        页面与元数据（静态导出）
components/
  second-voice-studio.tsx   工作室：写、念、停、修订、记录
  conversation-assist.tsx   听一个问题 → 三条回复
  recorded-demo.tsx         首页示例录音三章节
  speech-scene.tsx          文字 → 声音的舞台（逐词飞入、修订高亮）
  voice-sculpture.tsx       环绕 / 绸带 / 绽放 / 静止
  lang-provider.tsx         中英切换
lib/
  i18n.ts                   双语文案表（英文侧沿用原版原文）
  speech/zh-tts.ts          本机发声会话（与原版 TTS 同契约）
  speech/zh-listen.ts       本机听音会话（与原版 STT 同契约）
  speech/zh-replies.ts      本地回复建议
  text-zh.ts                中文分词（标点并入前词，高亮不停在标点上）
  speech-motion.ts          修订比对与逐词飞入
public/demo/                示例录音 + 词时间轴（中英各一套）
```

## 已知限制

- 音色来自设备：Windows 上是 Microsoft Huihui / Yaoyao 等，音质取决于系统
- 没有可用中文音色的环境（部分 Linux）能看、能记，但念不出声
- Safari / Firefox 的朗读边界不稳定，会退化成按节拍推进
- 语音识别需要 Chrome / Edge；不接受授权时仍可手打问题

## 许可

MIT。产品概念与交互结构来自 [Tarang Goyal 的 SecondVoice](https://github.com/taranggoyal70/secondvoice)（MIT），中文版实现与文案为本仓库改写。
