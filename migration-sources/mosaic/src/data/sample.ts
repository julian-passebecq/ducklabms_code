import type { ResultTable } from '../types'

export const initialResult: ResultTable = {
  columns: ['market', 'orders', 'revenue', 'avg_order'],
  rows: [
    { market: 'Norway', orders: 1842, revenue: 246310, avg_order: 133.72 },
    { market: 'Switzerland', orders: 1514, revenue: 221940, avg_order: 146.59 },
    { market: 'France', orders: 2378, revenue: 289410, avg_order: 121.70 },
    { market: 'Germany', orders: 1258, revenue: 178220, avg_order: 141.67 },
    { market: 'Sweden', orders: 1034, revenue: 132870, avg_order: 128.50 }
  ],
  elapsedMs: 18,
  origin: {
    blockId: 'demo',
    label: 'Demo market summary',
    kind: 'demo',
    runtime: 'browser',
    createdAt: new Date().toISOString()
  }
}

export const sampleSql = `-- Browser-local DuckDB\nSELECT\n  market,\n  COUNT(*) AS orders,\n  ROUND(SUM(amount), 2) AS revenue,\n  ROUND(AVG(amount), 2) AS avg_order\nFROM orders\nGROUP BY market\nORDER BY revenue DESC;`

export const samplePython = `# The current Mosaic shared result is available as input_df\n# Return a pandas DataFrame as the last expression to publish it downstream.\nimport pandas as pd\n\ndf = input_df.copy()\nif "revenue" in df.columns:\n    df["share"] = df["revenue"] / df["revenue"].sum()\n\ndf`
