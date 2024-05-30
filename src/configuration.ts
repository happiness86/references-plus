import { log } from 'node:console'
import { workspace } from 'vscode'
import { EXT_ID } from './constants'

export function getConfig() {
  return workspace.getConfiguration(EXT_ID)
}

export function addConfigListener(cb: () => any) {
  workspace.onDidChangeConfiguration((e) => {
    log(e.affectsConfiguration(EXT_ID))
    if (e.affectsConfiguration(EXT_ID))
      cb()
  })
}
