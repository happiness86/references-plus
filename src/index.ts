import { log } from 'node:console'
import { commands, window } from 'vscode'
import type { ExtensionContext, Location, Range } from 'vscode'
import { EXT_ID } from './constants'
import { ReferencesPlusTreeDataProvider } from './tree'
import type { History } from './types'

const MAX_INDEX = 10

export function activate(ext: ExtensionContext) {
  let index = 0
  const history: History = new Map()

  const rpTree = new ReferencesPlusTreeDataProvider(history)
  window.registerTreeDataProvider('references-plus', rpTree)

  ext.subscriptions.push(
    commands.registerCommand(`${EXT_ID}.getAllReferences`, async () => {
      if (!window.activeTextEditor)
        return

      commands.executeCommand('vscode.executeReferenceProvider', window.activeTextEditor.document.uri, window.activeTextEditor.selection.active).then((res: any) => {
        const locations = res as Location[]
        const referenceDataMap: Map<string, Range[]> = new Map()
        locations.forEach((item) => {
          const cache = referenceDataMap.get(item.uri.path)
          if (referenceDataMap.get(item.uri.path))
            cache?.push(item.range)

          else
            referenceDataMap.set(item.uri.path, [item.range])
        })
        if (index < MAX_INDEX) {
          history.set(index, referenceDataMap)
          index++
        }

        commands.executeCommand('reference-plus.refresh')
      })
    }),
    commands.registerCommand('reference-plus.refresh', () =>
      rpTree.refresh()),
  )
}

export function deactivate() {

}
