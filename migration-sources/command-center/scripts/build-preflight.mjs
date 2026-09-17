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

const missing = []
for (const packageName of requiredPackages) {
  try {
    require.resolve(packageName)
  } catch {
    missing.push(packageName)
  }
}

if (missing.length) {
  console.error('Build preflight: BLOCKED')
  console.error(`Missing installed dependencies: ${missing.join(', ')}`)
  console.error('Run npm install in the project directory, then rerun npm run build.')
  process.exit(1)
}

console.log('Build preflight: PASS')
