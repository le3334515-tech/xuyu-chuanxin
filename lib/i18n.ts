/**
 * 双语文案表。
 * zh 为中文，en 为英文；两套措辞各自成立。
 */

export type Lang = "zh" | "en";

export const LANGS: Lang[] = ["zh", "en"];

export const LANG_LABEL: Record<Lang, string> = {
  zh: "中文",
  en: "English",
};

/** 当前语言对应的发声语言（BCP-47 前缀） */
export const SPEECH_TAG: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en-US",
};

type Copy = {
  brand: { name: string; home: string };

  nav: {
    experience: string;
    madeForYou: string;
    source: string;
    about: string;
    startSpeaking: string;
    skipToExperience: string;
    skipToMessage: string;
    mainNav: string;
    language: string;
    switchToZh: string;
    switchToEn: string;
  };

  home: {
    award: string;
    heroLine1: string;
    heroLine2: string;
    heroP1: string;
    heroP2: string;
    heroCta: string;
    heroFootnote: string;
    principle: string;
    principleStrong: string;
    poweredBy: string;
    adaptedFrom: string;
    editorialEyebrow: string;
    editorialH2a: string;
    editorialH2b: string;
    editorialP: string;
    f1Index: string;
    f1H3a: string;
    f1H3b: string;
    f1P: string;
    f1Sample: string;
    f1Caption: string;
    f2Index: string;
    f2H3a: string;
    f2H3b: string;
    f2P: string;
    f2Old: string;
    f2New: string;
    f3Index: string;
    f3H3a: string;
    f3H3b: string;
    f3P: string;
    f3Tag: string;
    f3StrongA: string;
    f3StrongB: string;
    everydayEyebrow: string;
    everydayH2a: string;
    everydayH2b: string;
    everydayP: string;
    everydayLink: string;
    check1: string;
    check2: string;
    check3: string;
    libraryTitle: string;
    librarySub: string;
    librarySavedNote: string;
    trustH2a: string;
    trustH2b: string;
    trustP: string;
    trustSmall: string;
    closingEyebrow: string;
    closingH2a: string;
    closingH2b: string;
    closingCta: string;
    footerNote: string;
    footerCode: string;
  };

  demo: {
    eyebrow: string;
    sub: string;
    title: string;
    chapterSpeak: string;
    chapterInterrupt: string;
    chapterRevise: string;
    motion: string;
    motionOrbit: string;
    motionRibbon: string;
    motionBloom: string;
    motionCalm: string;
    play: string;
    stop: string;
    playAgain: string;
    noticeIdle: string;
    noticePaused: string;
    noticeSpeak: string;
    noticeStopChapter: string;
    noticeReviseChapter: string;
    noticeStopped: string;
    noticeFinished: string;
    noticeLoadFail: string;
    noticeStartFail: string;
    noticeStoppedByYou: string;
    chaptersLabel: string;
    motionLabel: string;
    topLeft: string;
    topRight: string;
    titles: [string, string, string];
  };

  scene: {
    yourMessage: string;
    revisedMessage: string;
    previousThought: string;
    footerRevised: string;
    footerSame: string;
    voice: string;
    connecting: string;
    becoming: string;
    complete: string;
    stopped: string;
    emptyTitle: string;
    emptySub: string;
    readyLabel: string;
    cutNote: string;
    noTiming: string;
    finishedNote: string;
    timingNote: string;
    revisedReceipt: string;
    changedWords: (n: number) => string;
  };

  studio: {
    workspaceLabel: string;
    h1: string;
    introP1: string;
    introP2: string;
    textSize: string;
    contrast: string;
    largerText: string;
    highContrast: string;
    offline: string;
    composeTitle: string;
    nextDraft: string;
    placeToBegin: string;
    draftTag: string;
    nextTag: string;
    onlyWhenChosen: string;
    placeholder: string;
    messageLabel: string;
    words: (n: number) => string;
    savePhrase: string;
    saved: string;
    clear: string;
    draftCleared: string;
    undo: string;
    voice: string;
    language: string;
    languageNoteA: string;
    languageNoteB: string;
    sampleNote: string;
    previewVoice: string;
    stopPreview: string;
    speakMessage: string;
    tryAgain: string;
    stop: string;
    showMessage: string;
    dataNote: string;
    phrasesTitle: string;
    phrasesHint: string;
    myPhrases: string;
    savedOnlyHere: string;
    phrasesEmptyA: string;
    phrasesEmptyB: string;
    phraseRemoved: string;
    phraseSaveFailed: string;
    removePhrase: (n: number, text: string) => string;
    playbackTitle: string;
    atYourPace: string;
    reviseThis: string;
    tryRecordedExample: string;
    showTextInstead: string;
    historyTitle: string;
    clearRecord: string;
    historyEmptyA: string;
    historyEmptyB: string;
    useAgain: string;
    entryComplete: string;
    entryStopped: string;
    playedBeforeStop: (text: string) => string;
    stoppedNoTiming: string;
    details: string;
    detailsP1: string;
    detailsFirstFrame: string;
    detailsNotMeasured: string;
    detailsMs: (ms: number) => string;
    connectingMobile: string;
    playingMobile: string;
    stopPlayback: string;
    footer: string;
    dialogEyebrow: string;
    backToWriting: string;
    dialogFooter: string;
    textOnly: string;
    useMessage: (text: string) => string;
    noticeIdle: string;
    noticePreviewFail: string;
    noticeStopped: string;
    noticeOffline: string;
    noticeConnecting: string;
    noticePlaying: string;
    noticeFinished: string;
    noticeStartFail: string;
    noticeEditMode: string;
    noticePhraseSavedFail: string;
    noticeNoVoice: string;
  };

  assist: {
    eyebrow: string;
    heading: string;
    micOn: string;
    micOff: string;
    micOpening: string;
    recorded: string;
    consent: string;
    stopSpeech: string;
    cancelListening: string;
    listenToQuestion: string;
    tryRecorded: string;
    giveMeMoment: string;
    privacy: string;
    questionRecorded: string;
    question: string;
    listening: string;
    whatBack: string;
    typeOrCorrect: string;
    questionLabel: string;
    suggestReplies: string;
    somethingElse: string;
    fewWords: string;
    intentPlaceholder: string;
    shapeReply: string;
    possibleReplies: string;
    speak: string;
    edit: string;
    findingWords: string;
    fewWays: string;
    youChoose: string;
    listenOrTry: string;
    speakingNotice: (text: string) => string;
    keyToggle: string;
    keyHint: string;
    keyPlaceholder: string;
    keySave: string;
    keyClear: string;
    keySaved: string;
    keyCleared: string;
    keyInvalid: string;
    keyProviderBrowser: string;
    keyProviderSf: string;
    keyProviderAai: string;
    noticeClarified: (ms: number, n: number) => string;
    noticeClarifyFallback: string;
    noticeClarifying: string;
    noticeReplied: (ms: number, n: number) => string;
    noticeQuestionReady: string;
    noticeFallback: string;
    fragmentLabel: string;
    authorship: string;
    authorshipHint: string;
    micOnSelf: string;
    modeListenTitle: string;
    modeListenHint: string;
    modeSelfTitle: string;
    modeSelfHint: string;
    startSelf: string;
    noticeSelfStart: string;
    noticeSelfListening: string;
    stepListen: string;
    stepTranscribe: string;
    stepDone: string;
    engineBuiltin: string;
    engineBrowser: string;
    engineSf: string;
    engineAai: string;
    noticeIdle: string;
    noticeCancel: string;
    noticeThinking: string;
    noticeReady: string;
    noticeShaped: string;
    noticeError: string;
    noticeRecordedOpen: string;
    noticeMicOpen: string;
    noticeTranscribing: string;
    noticeListening: string;
  };

  starters: string[];
  samples: { original: string; revised: string };
  sampleQuestion: string;
  defaultVoiceLine: { zh: string; en: string };
};

export const COPY: Record<Lang, Copy> = {
  zh: {
    brand: { name: "续语传心", home: "续语传心 首页" },
    nav: {
      experience: "示例体验",
      madeForYou: "为谁而做",
      source: "我们的仓库",
      about: "关于续语传心",
      startSpeaking: "开始说话",
      skipToExperience: "跳到示例体验",
      skipToMessage: "跳到正文",
      mainNav: "主导航",
      language: "语言",
      switchToZh: "切换为中文",
      switchToEn: "Switch to English",
    },
    home: {
      award: "写下来，就能被听见",
      heroLine1: "为你说不出口的",
      heroLine2: "那一句话。",
      heroP1: "先找到词，再让它替你说出来。",
      heroP2: "想改，随时都能改。",
      heroCta: "让我被听见",
      heroFootnote: "不用注册 · 听不听由你",
      principle: "说话跟着",
      principleStrong: "你的节奏走。",
      poweredBy: "在这台设备上发声",
      adaptedFrom: "聆风三客 出品",
      editorialEyebrow: "每个字后面，都有一个人",
      editorialH2a: "对话不是台词。",
      editorialH2b: "你可以改你的那句。",
      editorialP:
        "有些时刻，说话比写字难得多。续语传心把时间和主动权交回你手里，让你用自己的说法把事情讲清楚。",
      f1Index: "01 / 写下来",
      f1H3a: "说清你真正",
      f1H3b: "想说的那句。",
      f1P: "写下一个想法，或者从顺口的一句起手句开始。你没按下之前，什么都不会被念出去。",
      f1Sample: "我想再多要一点时间",
      f1Caption: "你的话，一个字都没被改。",
      f2Index: "02 / 拿回控制",
      f2H3a: "又想到一句？",
      f2H3b: "这里有位置。",
      f2P: "立刻停下播放，改一遍再说。下一句草稿始终是你的，随时可以动。",
      f2Old: "让我把这句话说完。",
      f2New: "算了，我重新说一遍。",
      f3Index: "03 / 给他看",
      f3H3a: "有时候，",
      f3H3b: "一块屏幕就够了。",
      f3P: "把这句话放到一个大而专注的界面上，让对方直接读。不需要出声，也不需要联网。",
      f3Tag: "给你的一句话",
      f3StrongA: "请直接问",
      f3StrongB: "我本人。",
      everydayEyebrow: "少一点准备，多一点对话",
      everydayH2a: "让每天都用的那句",
      everydayH2b: "就在手边。",
      everydayP: "有些话不该打两遍。把常用的存起来，改成你的说法，用的时候点一下就好。",
      everydayLink: "建立你的短语库",
      check1: "大字与高对比",
      check2: "中文与英文发声",
      check3: "念的时候还能写下一句",
      libraryTitle: "你的短语库",
      librarySub: "熟悉的话，随时可用。",
      librarySavedNote: "只有你按下的时候，才会存在这台浏览器里。",
      trustH2a: "你的声音。",
      trustH2b: "你说了算。",
      trustP:
        "发声在这台设备上完成，只有你按下「念出来」的那一版会被交给语音引擎。听音同样在本机进行，只为转写这一次提问。每一条建议你都可以改、可以不用。不做声音克隆。",
      trustSmall:
        "存下的短语留在你的浏览器里；草稿和对话记录在离开页面时清空。续语传心是一个辅助沟通原型，需要设备本身具备语音能力。",
      closingEyebrow: "停一下。还是你说话。",
      closingH2a: "有些话，",
      closingH2b: "只有你能说。",
      closingCta: "找到你的说法",
      footerNote: "为正在说话的那个人而做。",
      footerCode: "查看源码",
    },
    demo: {
      eyebrow: "一句话，始终是你的",
      sub: "示例录音",
      title: "一句话，始终是你的。",
      chapterSpeak: "念出来",
      chapterInterrupt: "打断",
      chapterRevise: "修订",
      motion: "动效",
      motionOrbit: "环绕",
      motionRibbon: "绸带",
      motionBloom: "绽放",
      motionCalm: "静止",
      play: "让它念",
      stop: "停止播放",
      playAgain: "再听一次",
      noticeIdle: "中文示例录音。按播放才出声。",
      noticePaused: "已暂停。准备好就按播放。",
      noticeSpeak: "一句一句地听。",
      noticeStopChapter: "听它在一句话中间停下来。",
      noticeReviseChapter: "修订后的一版。接下来是什么，由说话的人决定。",
      noticeStopped: "停在这里。想改随时可以改。",
      noticeFinished: "念完了。每个字都是说话的人自己选的。",
      noticeLoadFail: "录音没能加载，按播放再试一次。",
      noticeStartFail: "音频没能开始，按播放重试。",
      noticeStoppedByYou: "是你停下的。按播放可以再听。",
      chaptersLabel: "示例录音的三个片段",
      motionLabel: "视觉动效样式",
      topLeft: "从文字到声音",
      topRight: "示例录音",
      titles: ["让文字离开纸面。", "停下声音，想法还在。", "第二句话，也看得见。"],
    },
    scene: {
      yourMessage: "你说的话",
      revisedMessage: "你修订后的话",
      previousThought: "上一版",
      footerRevised: "换了说法，还是你在做主。",
      footerSame: "念的时候，文字一直留在屏幕上。",
      voice: "念出来的声音",
      connecting: "正在接通声音",
      becoming: "正在变成声音",
      complete: "念完了",
      stopped: "已停下",
      emptyTitle: "你的话。",
      emptySub: "等着被听见。",
      readyLabel: "声音已就绪",
      cutNote: "已经停下，草稿仍然是你的。",
      noTiming: "停下时还没拿到逐词时间。",
      finishedNote: "一句说完了。下一句，慢慢来。",
      timingNote: "逐词高亮跟着播放走。",
      revisedReceipt: "修订后的版本",
      changedWords: (n) => `${n} 处改动`,
    },
    studio: {
      workspaceLabel: "你的说话空间",
      h1: "你想说什么？",
      introP1: "写下来。念出来。慢慢来。",
      introP2: "由你决定。",
      textSize: "文字大小",
      contrast: "对比度",
      largerText: "放大文字",
      highContrast: "高对比",
      offline: "现在没有网络。可以继续写，或者用「显示给他看」。联网后发声会自动恢复。",
      composeTitle: "写下你要说的话",
      nextDraft: "下一句草稿",
      placeToBegin: "从这里开始",
      draftTag: "你的草稿",
      nextTag: "下一句",
      onlyWhenChosen: "只在你按下时才念",
      placeholder: "你想说什么？",
      messageLabel: "你要说的话",
      words: (n) => `${n} 字`,
      savePhrase: "存为短语",
      saved: "已存",
      clear: "清空",
      draftCleared: "草稿已清空。",
      undo: "撤销",
      voice: "音色",
      language: "语言",
      languageNoteA: "这是发声语言，",
      languageNoteB: "不是翻译。",
      sampleNote: "系统音色试听 · 不会改动你的草稿",
      previewVoice: "试听音色",
      stopPreview: "停止试听",
      speakMessage: "念出来",
      tryAgain: "再念一次",
      stop: "停止",
      showMessage: "显示给他看",
      dataNote: "只有你按下「念出来」的那一版会被送去发声。草稿留在这个标签页里。",
      phrasesTitle: "起手句",
      phrasesHint: "点一下改成你的话，再念。",
      myPhrases: "我的短语",
      savedOnlyHere: "只存在这台浏览器里。",
      phrasesEmptyA: "那些你会反复用到的话。",
      phrasesEmptyB: "写完一句，按「存为短语」留在这里。",
      phraseRemoved: "已从这台浏览器删除。",
      phraseSaveFailed: "这台浏览器没能存下短语，草稿还在。",
      removePhrase: (n, text) => `删除第 ${n} 条短语：${text}`,
      playbackTitle: "播放",
      atYourPace: "按你的节奏",
      reviseThis: "修订这句",
      tryRecordedExample: "试试示例录音",
      showTextInstead: "改为显示文字",
      historyTitle: "这段对话",
      clearRecord: "清空记录",
      historyEmptyA: "念过的话会出现在这里。",
      historyEmptyB: "刷新或离开这个页面就会清空。",
      useAgain: "再用一次",
      entryComplete: "已念完",
      entryStopped: "被打断",
      playedBeforeStop: (text) => `停下之前念到：「${text}」`,
      stoppedNoTiming: "停下时还没有可用的逐词时间。",
      details: "连接详情",
      detailsP1:
        "发声在这台设备上完成。逐词高亮是尽力而为的时间对齐，不代表别人真的听到了什么。",
      detailsFirstFrame: "首个音节：",
      detailsNotMeasured: "未测量",
      detailsMs: (ms) => `${ms} 毫秒（不含建立连接）`,
      connectingMobile: "正在连接…",
      playingMobile: "正在念你这句话",
      stopPlayback: "停止朗读",
      footer: "停一下。还是你说话。",
      dialogEyebrow: "给你的一句话",
      backToWriting: "回到书写",
      dialogFooter: "续语传心",
      textOnly: "只有文字 · 没有在放声音",
      useMessage: (text) => `使用这句话：${text}`,
      noticeIdle: "写下一句话，或者挑一句起手句改成你的说法。",
      noticePreviewFail: "这台设备没有可用的语音，换用 Chrome 或 Edge 试试。",
      noticeStopped: "已停下。草稿还在纸上，改完再念。",
      noticeOffline: "现在没有网络。你仍然可以把这句话显示在屏幕上。",
      noticeConnecting: "正在准备声音，随时可以停。",
      noticePlaying: "正在念这一句。你可以同时写下一句。",
      noticeFinished: "这一句念完了。下一句，慢慢来。",
      noticeStartFail: "声音没能启动。再试一次，或者先把文字显示出来。",
      noticeEditMode: "改成你的说法。没按「念出来」之前，什么都不会被念出去。",
      noticePhraseSavedFail: "这台浏览器没能存下短语，草稿还在。",
      noticeNoVoice: "这台设备没有可用的语音引擎：界面、记录都正常，但念不出声。换 Chrome / Edge 试试。",
    },
    assist: {
      eyebrow: "少打字，多是你。",
      heading: "留在对话里。",
      micOn: "麦克风已开",
      micOff: "麦克风关闭",
      micOpening: "正在打开麦克风",
      recorded: "示例问题",
      consent: "在场的每个人都知道并同意被听。",
      stopSpeech: "停止朗读",
      cancelListening: "取消听音与建议",
      listenToQuestion: "听一个问题",
      tryRecorded: "用一个示例问题试试",
      giveMeMoment: "给我一点时间",
      privacy:
        "听音在这台设备上完成，只为转写这一次提问；听完一句就结束。你没有按下之前，什么都不会被念出去。",
      questionRecorded: "示例问题 · 实时转写",
      question: "对方的问题",
      listening: "正在听…",
      whatBack: "你想怎么回答？",
      typeOrCorrect: "输入或修改问题",
      questionLabel: "问题",
      suggestReplies: "给我几个说法",
      somethingElse: "还想带点别的意思？",
      fewWords: "写几个字就够，最终念哪句由你定。",
      intentPlaceholder: "例如：不辣、少放盐",
      shapeReply: "按这个意思写",
      possibleReplies: "你可以这样说",
      speak: "念出来",
      edit: "改一改",
      findingWords: "正在找说法…",
      fewWays: "几种说法。",
      youChoose: "最终由你挑出像你的那一句。",
      listenOrTry: "听一个问题，或者用示例问题试试。你随时可以自己写。",
      speakingNotice: (text) => `正在念你这句话：「${text}」`,
      keyToggle: "高级：改用我自己的语音服务",
      keyHint:
        "Chrome 自带识别的语音服务在某些网络下不可用。填入你自己的 AssemblyAI key 后，这里改用它的中文流式转写。key 只存在这台设备的浏览器里。",
      keyPlaceholder: "粘贴 AssemblyAI API key",
      keySave: "保存并使用",
      keyClear: "清除",
      keySaved: "已保存，下次点「听一个问题」就走云端转写。",
      keyCleared: "已清除，回到浏览器自带识别。",
      keyInvalid: "key 看起来不对（至少 20 个字符）。",
      keyProviderBrowser: "浏览器自带（免费）",
      keyProviderSf: "硅基流动 · 国内可充值",
      keyProviderAai: "AssemblyAI · 海外",
      noticeClarified: (ms, n) => `补好了（${ms} 毫秒），共 ${n} 条。悬停可以看到差别，选一条，或者自己改。`,
      noticeClarifyFallback: "模型没接上，先把识别到的原话放在这儿，你可以直接改。",
      noticeClarifying: "正在把你说的话补成完整句子…",
      noticeReplied: (ms, n) => `按对方的问题生成了 ${n} 条（${ms} 毫秒）。往下翻，挑一条，或者改一改。`,
      noticeQuestionReady: "问题已经填好。点「给我几个说法」，我按这个问题生成回答。",
      noticeFallback: "模型暂时没接上，这几条是按常见说法给的。可以自己改，或者再点一次。",
      fragmentLabel: "你说的话（识别片段）",
      authorship: "你永远是表达的主人",
      authorshipHint: "AI 只负责把话理顺，选哪句、怎么改、什么时候念，都由你决定。",
      micOnSelf: "正在听你说",
      modeListenTitle: "听对方说",
      modeListenHint: "录下对方的问题，我再给回答",
      modeSelfTitle: "我自己说",
      modeSelfHint: "我说不清楚，让它补成通顺的话",
      startSelf: "开始说，我听着",
      noticeSelfStart: "准备好就说，说完停一下我就知道你说完了。",
      noticeSelfListening: "我在听。说不清楚也没关系，我会结合上下文猜你想说什么。",
      stepListen: "① 听你说",
      stepTranscribe: "② 转成文字",
      stepDone: "③ 补成句子",
      engineBuiltin: "当前已启用云端识别，开箱可用，不用配置。",
      engineBrowser: "当前用的是浏览器自带识别（可能受网络限制）。",
      engineSf: "当前用的是硅基流动语音识别。",
      engineAai: "当前用的是你自己的 AssemblyAI 凭据。",
      noticeIdle: "对方问了一句。接下来由你决定。",
      noticeCancel: "已停止听音。说什么是你的事。",
      noticeThinking: "已停止听音。正在准备几种说法…",
      noticeReady: "这些是可选说法，不是替你决定。只有确实是你想说的，才按「念出来」。",
      noticeShaped: "按你的意思写成了三句，确认措辞后再选「念出来」。",
      noticeError: "没能给出建议，你仍然可以自己写。",
      noticeRecordedOpen: "正在打开示例问题，麦克风保持关闭。",
      noticeMicOpen: "允许麦克风后，我只听一个问题。",
      noticeTranscribing: "正在实时转写示例问题…",
      noticeListening: "只听这一句：对方停下来就自动结束。",
    },
    starters: [
      "我需要一点时间，让我把话说完。",
      "请直接问我，不用替我回答。",
      "这不是我的意思，我重新说一遍。",
      "我可以继续了，谢谢。",
    ],
    samples: {
      original: "我需要一点时间，但这句话我想用自己的话说。",
      revised: "我自己来回答。给我一点时间，我会告诉你我需要什么。",
    },
    sampleQuestion: "你现在还需要再加一份吗？",
    defaultVoiceLine: { zh: "这是念出来时的声音。", en: "This is how your message will sound." },
  },

  en: {
    brand: { name: "Xuyu", home: "Xuyu home" },
    nav: {
      experience: "Experience",
      madeForYou: "Made for you",
      source: "Source code",
      about: "About Xuyu",
      startSpeaking: "Start speaking",
      skipToExperience: "Skip to the recorded experience",
      skipToMessage: "Skip to your message",
      mainNav: "Main navigation",
      language: "Language",
      switchToZh: "切换为中文",
      switchToEn: "Switch to English",
    },
    home: {
      award: "Write it, and it will be heard",
      heroLine1: "A voice for",
      heroLine2: "what you mean.",
      heroP1: "Find the words. Speak them aloud.",
      heroP2: "Change your mind whenever you need.",
      heroCta: "Make yourself heard",
      heroFootnote: "No account needed · optional listening",
      principle: "Speech that follows",
      principleStrong: "your lead.",
      poweredBy: "Powered by this device",
      adaptedFrom: "By Lingfeng Sanke",
      editorialEyebrow: "THERE’S A PERSON BEHIND EVERY WORD",
      editorialH2a: "Conversations aren’t scripts.",
      editorialH2b: "You can change yours.",
      editorialP:
        "For moments when speaking takes more, this gives you the time and control to say things your way.",
      f1Index: "01 / COMPOSE",
      f1H3a: "Say exactly",
      f1H3b: "what you mean.",
      f1P: "Write a thought or start with a familiar phrase. Nothing is spoken until you choose.",
      f1Sample: "I’d like a little more time",
      f1Caption: "Your words. Unchanged.",
      f2Index: "02 / TAKE CONTROL",
      f2H3a: "A second thought?",
      f2H3b: "There’s room for it.",
      f2P: "Stop playback instantly. Revise your message. Your next draft is always yours to edit.",
      f2Old: "Let me finish that thought.",
      f2New: "Actually, let me start again.",
      f3Index: "03 / SHOW YOUR WORDS",
      f3H3a: "Sometimes,",
      f3H3b: "a screen says it.",
      f3P: "Let someone read your message in a large, focused view. No speech connection required.",
      f3Tag: "A MESSAGE FOR YOU",
      f3StrongA: "Please ask",
      f3StrongB: "me directly.",
      everydayEyebrow: "LESS SETUP. MORE CONVERSATION.",
      everydayH2a: "Keep your everyday",
      everydayH2b: "words close.",
      everydayP:
        "Some things shouldn’t need typing twice. Save the phrases you choose, make them your own, and bring them back with a tap.",
      everydayLink: "Build your phrase library",
      check1: "Larger text & high contrast",
      check2: "Chinese & English speech",
      check3: "A new draft while you speak",
      libraryTitle: "Your phrase library",
      librarySub: "Familiar words. Ready when you are.",
      librarySavedNote: "Saved on your browser, only when you ask.",
      trustH2a: "Your voice.",
      trustH2b: "Your call.",
      trustP:
        "Speech is synthesized on this device — only the message you press Speak on reaches the voice engine. Optional listening stays local too, and every reply is yours to edit before it speaks. No voice cloning.",
      trustSmall:
        "Saved phrases stay on your browser; drafts and conversation history disappear when you leave. An assistive communication prototype that needs a device voice.",
      closingEyebrow: "A PAUSE. STILL YOUR TURN.",
      closingH2a: "There’s something",
      closingH2b: "only you can say.",
      closingCta: "Find your words",
      footerNote: "Made for the person speaking.",
      footerCode: "View source",
    },
    demo: {
      eyebrow: "ONE THOUGHT. ALWAYS YOURS.",
      sub: "Recorded speech",
      title: "ONE THOUGHT. ALWAYS YOURS.",
      chapterSpeak: "Speak",
      chapterInterrupt: "Interrupt",
      chapterRevise: "Revise",
      motion: "Motion",
      motionOrbit: "Orbit",
      motionRibbon: "Ribbon",
      motionBloom: "Bloom",
      motionCalm: "Calm",
      play: "Let it speak",
      stop: "Stop playback",
      playAgain: "Play again",
      noticeIdle: "Recorded example. Sound starts when you press play.",
      noticePaused: "Paused. Press play whenever you’re ready.",
      noticeSpeak: "Listen to the message, word by word.",
      noticeStopChapter: "Listen as playback stops mid-thought.",
      noticeReviseChapter: "A revised message. The speaker decides what comes next.",
      noticeStopped: "Stopped. There is room to change your mind.",
      noticeFinished: "Finished. Every word was chosen by the speaker.",
      noticeLoadFail: "The recording could not load. Press play to retry.",
      noticeStartFail: "Audio could not start. Press play to try again.",
      noticeStoppedByYou: "Stopped by you. Press play to listen again.",
      chaptersLabel: "Recorded example chapters",
      motionLabel: "Visual motion style",
      topLeft: "FROM WORDS TO VOICE",
      topRight: "Recorded speech",
      titles: [
        "Let the words leave the page.",
        "Stop the voice. Keep your thought.",
        "A second thought, made visible.",
      ],
    },
    scene: {
      yourMessage: "YOUR MESSAGE",
      revisedMessage: "YOUR REVISED MESSAGE",
      previousThought: "Previous thought",
      footerRevised: "New words. Same person in control.",
      footerSame: "Your words stay visible while the voice speaks.",
      voice: "YOUR VOICE",
      connecting: "CONNECTING YOUR VOICE",
      becoming: "BECOMING SPEECH",
      complete: "MESSAGE COMPLETE",
      stopped: "PLAYBACK STOPPED",
      emptyTitle: "Your words.",
      emptySub: "Ready to be heard.",
      readyLabel: "Your voice is ready",
      cutNote: "Playback stopped. The draft remains yours.",
      noTiming: "Stopped before word timing arrived.",
      finishedNote: "A thought, spoken. Take your time with the next.",
      timingNote: "Word highlights follow playback timing.",
      revisedReceipt: "Revised message",
      changedWords: (n) => `${n} ${n === 1 ? "new word" : "new words"}`,
    },
    studio: {
      workspaceLabel: "YOUR SPEAKING SPACE",
      h1: "What would you like to say?",
      introP1: "Write. Speak. Take your time.",
      introP2: "You’re in control.",
      textSize: "Text size",
      contrast: "Contrast",
      largerText: "Larger text",
      highContrast: "High contrast",
      offline:
        "You’re offline. Keep writing, or use Show message. Live voice will return when you reconnect.",
      composeTitle: "Write your message",
      nextDraft: "Your next draft",
      placeToBegin: "A place to begin",
      draftTag: "YOUR DRAFT",
      nextTag: "NEXT THOUGHT",
      onlyWhenChosen: "Only speaks when you choose",
      placeholder: "What would you like to say?",
      messageLabel: "Your message",
      words: (n) => `${n} ${n === 1 ? "word" : "words"}`,
      savePhrase: "Save phrase",
      saved: "Saved",
      clear: "Clear",
      draftCleared: "Draft cleared.",
      undo: "Undo",
      voice: "Voice",
      language: "Language",
      languageNoteA: "Synthesis language,",
      languageNoteB: "not translation.",
      sampleNote: "System voice preview · your message stays unchanged",
      previewVoice: "Preview voice",
      stopPreview: "Stop preview",
      speakMessage: "Speak message",
      tryAgain: "Try voice again",
      stop: "Stop",
      showMessage: "Show message",
      dataNote:
        "Only the message you press Speak on reaches the voice engine. Your draft stays in this tab.",
      phrasesTitle: "A place to start",
      phrasesHint: "Tap to edit, then speak.",
      myPhrases: "My phrases",
      savedOnlyHere: "Saved only on this browser.",
      phrasesEmptyA: "Words you come back to.",
      phrasesEmptyB: "Write a message and choose Save phrase to keep it here.",
      phraseRemoved: "Phrase removed from this browser.",
      phraseSaveFailed: "This browser couldn’t save phrases. Your draft is still available.",
      removePhrase: (n, text) => `Remove saved phrase ${n}: ${text}`,
      playbackTitle: "Playback",
      atYourPace: "At your pace",
      reviseThis: "Revise this message",
      tryRecordedExample: "Try the recorded example",
      showTextInstead: "Show text instead",
      historyTitle: "In this conversation",
      clearRecord: "Clear record",
      historyEmptyA: "Your conversation will appear here.",
      historyEmptyB: "It disappears when you reload or leave this page.",
      useAgain: "Use again",
      entryComplete: "Completed",
      entryStopped: "Stopped",
      playedBeforeStop: (text) => `Timed playback before stopping: “${text}”`,
      stoppedNoTiming: "Stopped before word timing was available.",
      details: "Connection details",
      detailsP1:
        "Synthesis happens on this device. Word highlights are best-effort timing, not proof of what someone heard.",
      detailsFirstFrame: "First audio frame: ",
      detailsNotMeasured: "not measured",
      detailsMs: (ms) => `${ms} ms (excludes connection setup)`,
      connectingMobile: "Connecting…",
      playingMobile: "Your message is playing",
      stopPlayback: "Stop playback",
      footer: "A pause. Still your turn.",
      dialogEyebrow: "A MESSAGE FOR YOU",
      backToWriting: "Back to writing",
      dialogFooter: "续语传心",
      textOnly: "Text only · no audio is playing",
      useMessage: (text) => `Use message: ${text}`,
      noticeIdle: "Write a thought, or choose a phrase to make your own.",
      noticePreviewFail: "No device voice is available. Try Chrome or Edge.",
      noticeStopped: "Stopped. Your draft is still here. Edit it and speak when you’re ready.",
      noticeOffline: "You’re offline. You can still show your message on screen.",
      noticeConnecting: "Getting your voice ready. You can stop at any time.",
      noticePlaying: "Your message is playing. You can already write your next thought.",
      noticeFinished: "Message finished. Take your time with the next one.",
      noticeStartFail: "Voice couldn’t start. Please try again, or show your message on screen.",
      noticeEditMode: "Make it yours. Nothing is spoken until you press Speak.",
      noticePhraseSavedFail: "This browser couldn’t save phrases. Your draft is still available.",
      noticeNoVoice:
        "This device has no speech engine: the interface and records still work, but nothing will be spoken. Try Chrome or Edge.",
    },
    assist: {
      eyebrow: "LESS TYPING. MORE YOU.",
      heading: "Stay in the conversation.",
      micOn: "Microphone on",
      micOff: "Microphone off",
      micOpening: "Opening microphone",
      recorded: "Recorded question",
      consent: "Everyone here knows and agrees to listening.",
      stopSpeech: "Stop speech",
      cancelListening: "Cancel listening & suggestions",
      listenToQuestion: "Listen to a question",
      tryRecorded: "Try a recorded question",
      giveMeMoment: "Give me a moment",
      privacy:
        "Listening happens on this device, for this one question only. Nothing is spoken until you choose.",
      questionRecorded: "RECORDED EXAMPLE · LIVE TRANSCRIPTION",
      question: "THE QUESTION",
      listening: "Listening…",
      whatBack: "What would you like to say back?",
      typeOrCorrect: "Type or correct the question",
      questionLabel: "Question",
      suggestReplies: "Suggest replies",
      somethingElse: "Something else in mind?",
      fewWords: "A few words are enough. You approve the full reply.",
      intentPlaceholder: "e.g. pasta, no mushrooms",
      shapeReply: "Shape my reply",
      possibleReplies: "YOUR POSSIBLE REPLIES",
      speak: "Speak",
      edit: "Edit",
      findingWords: "Finding the words…",
      fewWays: "A few ways to answer.",
      youChoose: "You’ll choose what sounds like you.",
      listenOrTry:
        "Listen to a question, or try the recorded example. You can always write your own.",
      speakingNotice: (text) => `Speaking your message: “${text}”`,
      keyToggle: "Advanced: use my own speech service",
      keyHint:
        "Chrome's built-in recognition relies on an external service that some networks block. With your own AssemblyAI key, listening switches to its multilingual streaming transcription. The key stays in this browser.",
      keyPlaceholder: "Paste your AssemblyAI API key",
      keySave: "Save and use",
      keyClear: "Clear",
      keySaved: "Saved. The next Listen uses cloud transcription.",
      keyCleared: "Cleared. Back to the browser's own recognition.",
      keyInvalid: "That key looks too short (at least 20 characters).",
      keyProviderBrowser: "Browser built-in (free)",
      keyProviderSf: "SiliconFlow · China",
      keyProviderAai: "AssemblyAI · global",
      noticeClarified: (ms, n) => `Smoothed it out (${ms} ms) — ${n} options. Pick one, or edit it.`,
      noticeClarifyFallback: "The model didn't answer — here is what was recognised, edit it directly.",
      noticeClarifying: "Turning what you said into a full sentence…",
      noticeReplied: (ms, n) => `${n} replies for that question (${ms} ms). Scroll down and pick one.`,
      noticeQuestionReady: "Question filled in. Tap “Suggest replies” to generate answers.",
      noticeFallback: "The model is unavailable — these are common phrasings. Edit, or try again.",
      fragmentLabel: "What you said (recognised)",
      authorship: "You are always the author",
      authorshipHint: "The model only smooths the words. You choose the sentence, edit it, and decide when it speaks.",
      micOnSelf: "Listening to you",
      modeListenTitle: "Hear them out",
      modeListenHint: "Record their question, I draft an answer",
      modeSelfTitle: "I'll speak",
      modeSelfHint: "My speech is unclear — smooth it for me",
      startSelf: "Start talking, I'm listening",
      noticeSelfStart: "Speak when ready; pause and I'll know you finished.",
      noticeSelfListening: "I'm listening. Unclear is fine — I'll infer from context.",
      stepListen: "① Listening",
      stepTranscribe: "② Transcribing",
      stepDone: "③ Smoothing",
      engineBuiltin: "Cloud recognition is on and ready — nothing to configure.",
      engineBrowser: "Using the browser's built-in recognition (may be blocked).",
      engineSf: "Using SiliconFlow recognition.",
      engineAai: "Using your own AssemblyAI key.",
      noticeIdle: "A question comes in. You choose what comes next.",
      noticeCancel: "Listening is off. Your words stay in your control.",
      noticeThinking: "Listening is off. Preparing a few possible replies…",
      noticeReady: "Possible replies, not assumptions. Tap Speak only if it’s what you mean.",
      noticeShaped: "Your meaning, in a full reply. Check the wording, then choose Speak.",
      noticeError: "Suggestions couldn’t load. You can still write your own reply.",
      noticeRecordedOpen: "Opening a recorded question. Your microphone stays off.",
      noticeMicOpen: "Allow microphone access to hear one question.",
      noticeTranscribing: "Transcribing the recorded question live…",
      noticeListening: "Listening for one question. Stops automatically after the speaker pauses.",
    },
    starters: [
      "I need a little more time.",
      "Please ask me directly.",
      "That isn’t what I meant.",
      "I’m ready to continue.",
    ],
    samples: {
      original: "I need a little more time, but I want to answer this in my own words.",
      revised: "I want to answer for myself. Give me a moment, and I will tell you what I need.",
    },
    sampleQuestion: "Are you ready to order, or do you need a minute?",
    defaultVoiceLine: { zh: "这是念出来时的声音。", en: "This is how your message will sound." },
  },
};
