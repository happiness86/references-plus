import { log } from 'node:console'
import { Selection, commands, window, workspace } from 'vscode'
import type { ExtensionContext, Location } from 'vscode'
import { EXT_ID } from './constants'
import { ReferencesPlusTreeDataProvider } from './tree'
import type { History, ReferenceData } from './types'

const MAX_INDEX = 10

export function activate(ext: ExtensionContext) {
  let index = 0
  const history: History = new Map()

  const rpTree = new ReferencesPlusTreeDataProvider(history)
  // window.registerTreeDataProvider('references-plus', rpTree)
  window.createTreeView('references-plus', {
    treeDataProvider: rpTree,
  })

  ext.subscriptions.push(
    commands.registerCommand(`${EXT_ID}.getAllReferences`, async () => {
      if (!window.activeTextEditor)
        return

      commands.executeCommand('references-plus.focus')

      commands.executeCommand('vscode.executeReferenceProvider', window.activeTextEditor.document.uri, window.activeTextEditor.selection.active).then(async (res: any) => {
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

        const document = locations[0].uri.path === window.activeTextEditor!.document.uri.path ? window.activeTextEditor!.document : await workspace.openTextDocument(locations[0].uri)
        const text = document.getText(locations[0].range) || ''

        if (history.size < MAX_INDEX) {
          history.set({ index, text }, referenceDataMap)
          index++
        }
        else {
          const keys = history.keys()
          history.delete(keys.next().value)
        }

        commands.executeCommand(`${EXT_ID}.refresh`)
      })
    }),
    commands.registerCommand(`${EXT_ID}.refresh`, () =>
      rpTree.refresh()),
    commands.registerCommand(`${EXT_ID}.selectNode`, async (loc: Location) => {
      // const document = await workspace.openTextDocument(element[0].filePath)
      // window.showTextDocument(document)
      commands.executeCommand('vscode.open', loc.uri, {
        selection: new Selection(loc.range.start, loc.range.end),
      })
    }),
    commands.registerCommand(`${EXT_ID}.clear`, async () => {
      history.clear()
      commands.executeCommand(`${EXT_ID}.refresh`)
    }),
  )
}

export function deactivate() {

}
