import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requiredPackages = [
  'react',
  'react-dom',
  '@fluentui/react-components',
  'vite',
  '@vitejs/plugin-react',
  'typescript',
]

console.log(`Node: ${process.version}`)
console.log(`Working directory: ${process.cwd()}`)
console.log(`node_modules: ${fs.existsSync('node_modules') ? 'present' : 'missing'}`)
for (const packageName of requiredPackages) {
  try {
    const resolved = require.resolve(packageName)
    console.log(`PASS ${packageName}: ${resolved}`)
  } catch {
    console.log(`MISSING ${packageName}`)
  }
}
