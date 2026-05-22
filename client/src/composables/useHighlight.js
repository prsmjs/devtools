import { ref, onMounted } from 'vue'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import json from 'shiki/langs/json.mjs'

const highlighterRef = ref(null)
const ready = ref(false)
let initPromise = null

const theme = {
  name: 'devtools-light',
  type: 'light',
  bg: 'transparent',
  fg: '#000000',
  settings: [
    { scope: ['string'], settings: { foreground: '#2c7a4e' } },
    { scope: ['constant.numeric'], settings: { foreground: '#5b3fcb' } },
    { scope: ['constant.language.boolean', 'constant.language'], settings: { foreground: '#b86b00' } },
    { scope: ['constant.language.null'], settings: { foreground: 'rgba(0,0,0,0.4)' } },
    { scope: ['support.type.property-name'], settings: { foreground: '#000000' } },
    { scope: ['punctuation'], settings: { foreground: 'rgba(0,0,0,0.4)' } },
  ],
}

function init() {
  if (initPromise) return initPromise
  initPromise = createHighlighterCore({
    themes: [theme],
    langs: [json],
    engine: createJavaScriptRegexEngine(),
  }).then((h) => {
    highlighterRef.value = h
    ready.value = true
    return h
  })
  return initPromise
}

export function useHighlight() {
  onMounted(init)

  function highlight(value) {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    if (!json) return ''
    if (!highlighterRef.value) return escapeHtml(json)
    return highlighterRef.value.codeToHtml(json, {
      lang: 'json',
      theme: 'devtools-light',
    })
  }

  return { highlight, ready }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
