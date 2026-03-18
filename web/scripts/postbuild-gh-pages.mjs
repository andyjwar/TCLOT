#!/usr/bin/env node
/** GitHub Pages: serve SPA for unknown paths (e.g. refresh). */
import { copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const index = join(dist, 'index.html')
if (existsSync(index)) {
  copyFileSync(index, join(dist, '404.html'))
  console.log('postbuild: wrote dist/404.html (GitHub Pages)')
}
