/**
 * 录音环境自检。
 *
 * 手机上最常见的两个坑：
 *  - 微信 / QQ 内置浏览器不给麦克风，必须「在浏览器打开」；
 *  - 非 HTTPS 页面拿不到 getUserMedia。
 * 这两种情况如果只报一句「麦克风没能打开」，用户根本不知道该干什么，
 * 所以先查清楚再说话。
 */

export type EnvIssue = {
  code: "in-app-browser" | "no-media" | "no-worklet" | "insecure" | "no-recorder";
  zh: string;
  en: string;
};

export function checkRecordingEnv(): EnvIssue | null {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";

  // 微信 / QQ / 微博等内置浏览器：麦克风基本拿不到
  if (/MicroMessenger|QQ\/|Weibo|AlipayClient|DingTalk/i.test(ua)) {
    return {
      code: "in-app-browser",
      zh: "这是微信/QQ 的内置浏览器，它不放麦克风给网页。点右上角的「…」→「在浏览器打开」，再点「听一个问题」就能说话了。",
      en: "This is an in-app browser (WeChat/QQ) and it blocks the microphone. Open the page in your real browser, then tap Listen.",
    };
  }

  if (!window.isSecureContext) {
    return {
      code: "insecure",
      zh: "当前页面不是 HTTPS，浏览器不给麦克风。请用 https 打开。",
      en: "This page is not served over HTTPS, so the microphone is blocked.",
    };
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    return {
      code: "no-media",
      zh: "这个浏览器不提供录音能力。换用 Chrome、Edge 或系统自带浏览器。",
      en: "This browser offers no audio capture. Try Chrome, Edge, or the system browser.",
    };
  }

  const scope = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = scope.AudioContext || scope.webkitAudioContext;
  if (!Ctor) {
    return {
      code: "no-recorder",
      zh: "这个浏览器没有音频处理能力，没法录音。换用 Chrome 或 Edge。",
      en: "This browser can't process audio. Try Chrome or Edge.",
    };
  }
  if (!("audioWorklet" in Ctor.prototype)) {
    return {
      code: "no-worklet",
      zh: "这个浏览器版本偏旧，不支持录音需要的音频模块。升级浏览器，或用 Chrome / Edge。",
      en: "This browser is too old for the audio module recording needs. Update it, or use Chrome / Edge.",
    };
  }

  return null;
}
