import { Selection, commands, window, workspace } from 'vscode'
import type { ExtensionContext, Location } from 'vscode'
import { ConfigKey, EXT_ID } from './constants'
import type { ReferenceItem } from './tree'
import { ReferencesPlusTreeDataProvider } from './tree'
import type { History, ReferenceData } from './types'
import { areLocationsEqual, resortHistory } from './utils'
import { addConfigListener, getConfig } from './configuration'

export function activate(ext: ExtensionContext) {
  let index = 0
  const history: History = new Map()

  let config = getConfig()
  addConfigListener(() => {
    if (history.size) {
      config = getConfig()
      commands.executeCommand(`${EXT_ID}.refresh`)
    }
  })

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

        let flag = false

        const silent = config.get(ConfigKey.SILENT)
        const replenish = config.get(ConfigKey.REPLENISH)

        for (const [hisKey, refsMap] of history) {
          if (areLocationsEqual(hisKey.firstLocation, locations[0])) {
            if (!silent) {
              const index = hisKey.index + 1
              window.showInformationMessage(`The references have been added to the tree view at ${index > 3 ? `${index}th` : `${index}st`}`)
            }

            if (replenish) {
              let len = 0
              for (const iterator of refsMap.values())
                len += iterator.length

              if (len !== locations.length) {
                locations.forEach((item) => {
                  const cache = refsMap.get(item.uri.path)
                  if (refsMap.get(item.uri.path)) {
                    const isExist = cache?.find(c => areLocationsEqual(c, item))
                    if (!isExist)
                      cache?.push(item)
                  }
                  else {
                    refsMap.set(item.uri.path, [item])
                  }
                })
              }
            }

            flag = true
            break
          }
        }

        if (!flag) {
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

          if (history.size >= (config.get(ConfigKey.MAX) as number)) {
            const keys = history.keys()
            history.delete(keys.next().value)
            resortHistory(history)
          }

          index = history.size

          history.set({ index: index++, text, firstLocation: locations[0] }, referenceDataMap)
        }

        commands.executeCommand(`${EXT_ID}.refresh`)
      })
    }),
    commands.registerCommand(`${EXT_ID}.refresh`, () => {
      const max: number = config.get(ConfigKey.MAX)!

      while (history.size > max)
        history.delete(history.keys().next().value)

      rpTree.refresh()
    }),
    commands.registerCommand(`${EXT_ID}.selectNode`, async (loc: Location) => {
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
      const nodeId = referenceItem._id
      if (!nodeId)
        return
      // root node
      if (!Array.isArray(nodeId)) {
        history.delete(nodeId)
        resortHistory(history)
      }
      else {
        const [hisKey, filePath, index] = nodeId
        const referenceData = history.get(hisKey)
        // second level
        if (nodeId.length === 2) {
          referenceData?.delete(filePath)
          if (referenceData?.size === 0) {
            history.delete(hisKey)
            resortHistory(history)
          }
        }
        // leaf node
        else if (nodeId.length === 3) {
          const locations = referenceData!.get(filePath)!
          locations.splice(index!, 1)

          if (locations.length === 0)
            referenceData?.delete(filePath)

          if (referenceData?.size === 0) {
            history.delete(hisKey)
            resortHistory(history)
          }
        }
      }
      commands.executeCommand(`${EXT_ID}.refresh`)
    }),
  )
}

export function deactivate() {

}
