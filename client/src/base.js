const tag = document.querySelector('base')
const href = tag ? tag.getAttribute('href') : '/'

export const base = href.endsWith('/') ? href : href + '/'
export const basePath = base.replace(/\/+$/, '')
