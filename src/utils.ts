import { commands } from 'vscode'
import type { History, HistoryKey } from './types'

export class ContextKey<T> {
  constructor(public name: string) {}

  async set(value: T) {
    await commands.executeCommand('setContext', this.name, value)
  }
}

export function resortHistory(history: History) {
  let index = 0
  for (const hisKey of history.keys())
    hisKey.index = index++
}
