function getBase() {
  const path = window.location.pathname
  const hashIndex = path.indexOf('#')
  const clean = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  return clean.replace(/\/+$/, '')
}

const base = getBase()

export function api(path) {
  return `${base}/api${path}`
}
