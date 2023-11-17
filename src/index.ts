import { log } from 'node:console'
import { commands, window } from 'vscode'
import type { ExtensionContext, Location } from 'vscode'
import { EXT_ID } from './constants'
import { ReferencesPlusTreeDataProvider } from './tree'
import type { History, ReferenceData } from './types'

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

        log('res', locations)
        const referenceDataMap: ReferenceData = new Map()
        locations.forEach((item) => {
          const cache = referenceDataMap.get(item.uri.path)
          if (referenceDataMap.get(item.uri.path))
            cache?.push(item)

          else
            referenceDataMap.set(item.uri.path, [item])
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
