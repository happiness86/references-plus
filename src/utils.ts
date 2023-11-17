import { commands } from 'vscode'

export class ContextKey<T> {
  constructor(public name: string) {}

  async set(value: T) {
    await commands.executeCommand('setContext', value)
  }
}
