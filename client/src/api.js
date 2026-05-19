import { basePath } from './base.js'

export function api(path) {
  return `${basePath}/api${path}`
}
