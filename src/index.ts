import { log } from 'node:console'
import { Selection, commands, window, workspace } from 'vscode'
import type { ExtensionContext, Location, TreeItemCollapsibleState } from 'vscode'
import { EXT_ID, SYMBOL } from './constants'
import type { ReferenceItem } from './tree'
import { ReferencesPlusTreeDataProvider } from './tree'
import type { History, ReferenceData } from './types'
import { resortHistory } from './utils'

const MAX_INDEX = 50

export function activate(ext: ExtensionContext) {
  let index = 0
  const history: History = new Map()

  const rpTree = new ReferencesPlusTreeDataProvider(history)
  window.createTreeView('references-plus', {
    treeDataProvider: rpTree,
    showCollapseAll: true,
  })

  ext.subscriptions.push(
    commands.registerCommand(`${EXT_ID}.getAllReferences`, async () => {
      if (!window.activeTextEditor)
        return

      commands.executeCommand('references-plus.focus')

      commands.executeCommand('vscode.executeReferenceProvider', window.activeTextEditor.document.uri, window.activeTextEditor.selection.active).then(async (res: any) => {
        const locations = res as Location[]

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

        if (history.size >= MAX_INDEX) {
          const keys = history.keys()
          history.delete(keys.next().value)
          resortHistory(history)
        }

        index = history.size

        history.set({ index: index++, text }, referenceDataMap)

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
      index = 0
      commands.executeCommand(`${EXT_ID}.refresh`)
    }),
    commands.registerCommand(`${EXT_ID}.deleteEntry`, async (...args: ReferenceItem[]) => {
      if (!args.length)
        return
      const referenceItem = args[0]
      const nodeId = referenceItem.id
      if (!nodeId)
        return
      const nodeIds = nodeId.split(SYMBOL)
      const [historyIndex, filePath, locIndex] = nodeIds

      for (const [hisKey, referenceData] of history) {
        // delete first level node
        if (nodeIds.length === 1 && hisKey.index === +historyIndex) {
          history.delete(hisKey)
          // resort history index
          resortHistory(history)
          break
        }
        else {
          // delete second level node
          if (nodeIds.length === 2 && hisKey.index === +historyIndex && referenceData.has(filePath)) {
            referenceData.delete(filePath)
            if (referenceData.size === 0) {
              history.delete(hisKey)
              // resort history index
              resortHistory(history)
              break
            }
          }
          else {
            // delete leaf node
            const locations = referenceData.get(filePath)
            if (locations) {
              const loc = locations[+locIndex]
              if (loc) {
                locations.splice(+locIndex, 1)
                if (locations.length === 0)
                  referenceData.delete(filePath)
                if (referenceData.size === 0) {
                  history.delete(hisKey)
                  // resort history index
                  resortHistory(history)
                }
                break
              }
            }
          }
        }
      }
      commands.executeCommand(`${EXT_ID}.refresh`)
    }),
  )
}

export function deactivate() {

}
