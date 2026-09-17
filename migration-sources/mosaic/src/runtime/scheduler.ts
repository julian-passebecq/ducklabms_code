export interface BlockRunOutcome {
  blockId: string
  ok: boolean
}

function runBlock(blockId: string, timeoutMs = 120000): Promise<BlockRunOutcome> {
  return new Promise((resolve) => {
    const eventName = `mosaic:block-complete:${blockId}`
    let timer = 0
    const finish = (event: Event) => {
      window.clearTimeout(timer)
      window.removeEventListener(eventName, finish)
      const detail = (event as CustomEvent<{ ok?: boolean }>).detail
      resolve({ blockId, ok: detail?.ok !== false })
    }
    window.addEventListener(eventName, finish)
    timer = window.setTimeout(() => {
      window.removeEventListener(eventName, finish)
      resolve({ blockId, ok: false })
    }, timeoutMs)
    window.dispatchEvent(new CustomEvent('mosaic:run-block', { detail: { blockId } }))
  })
}

export async function runBlocksSequentially(blockIds: string[]): Promise<BlockRunOutcome[]> {
  const outcomes: BlockRunOutcome[] = []
  for (const blockId of blockIds) {
    const outcome = await runBlock(blockId)
    outcomes.push(outcome)
    if (!outcome.ok) break
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  }
  return outcomes
}
