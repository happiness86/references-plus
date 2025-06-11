import * as path from 'node:path'
import { log } from 'node:console'
import type { Command, Event, Location, TreeDataProvider, TreeItemLabel, Uri } from 'vscode'
import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState, window, workspace } from 'vscode'
import type { History, HistoryKey, ReferenceData } from './types'
import { ConfigKey, EXT_ID } from './constants'
import { getConfig } from './configuration'

export class ReferencesPlusTreeDataProvider implements TreeDataProvider<ReferenceItem | ReferenceItemRoot> {
  constructor(public referenceData: History) {
  }

  config = getConfig()

  private _onDidChangeTreeData: EventEmitter<void | ReferenceItem | null | undefined> = new EventEmitter<void | ReferenceItem | null | undefined>()

  onDidChangeTreeData?: Event<void | ReferenceItem | ReferenceItem[] | null | undefined> = this._onDidChangeTreeData.event

  refresh() {
    this.config = getConfig()
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: ReferenceItem): ReferenceItem {
    return element
  }

  async getChildren(element?: ReferenceItem | ReferenceItemRoot | undefined) {
    if (!this.referenceData.size)
      return
    if (element) {
      const contents = []
      if ('referenceDataMap' in element && element.referenceDataMap) {
        for (const [filePath, loc] of element.referenceDataMap) {
          const basename = path.basename(filePath)
          const workspaceFolder = workspace.getWorkspaceFolder(loc[0].uri)?.uri.path
          let description
          if (workspaceFolder)
            description = path.relative(workspaceFolder, filePath)
          else
            description = filePath
          description = path.dirname(description)

          const id = [element._id, filePath] as [HistoryKey, string]
          contents.push(
            new ReferenceItemRoot(id, { label: basename }, description, TreeItemCollapsibleState.Expanded, '', loc, filePath),
          )
        }
      }
      else {
        const trimWhitespace = this.config.get(ConfigKey.PW)
        for (let i = 0; i < element.loc!.length; i++) {
          const l = element.loc![i]
          const r = l.range
          let text = ''
          const highlights: [number, number][] = []
          if (element.filePath !== window.activeTextEditor?.document.uri.path) {
            const document = await workspace.openTextDocument(element.filePath!)
            text = document.lineAt(r.start.line).text || ''
          }
          else {
            text = window.activeTextEditor?.document.lineAt(r.start.line).text || ''
          }

          const highlightsText = text.slice(r.start.character, r.end.character)

          if (trimWhitespace) {
            text = text.trim()
            const start = text.indexOf(highlightsText)
            const end = start + highlightsText.length
            highlights.push([start, end])
          }
          else {
            highlights.push([r.start.character, r.end.character])
          }
          const command: Command = {
            title: 'Open',
            command: `${EXT_ID}.selectNode`,
            arguments: [l],
          }
          const id = [...(element._id as [HistoryKey, string]), i] as [HistoryKey, string, number]
          contents.push(new ReferenceItem(id, l.uri, { label: text, highlights }, TreeItemCollapsibleState.None, ThemeIcon.File, command))
        }
      }

      return contents
    }
    else {
      const result = []
      for (const [key, referenceDataMap] of this.referenceData) {
        let len = 0
        for (const iterator of referenceDataMap.values())
          len += iterator.length
        result.push(
          new ReferenceItemRoot(key, { label: `${key.index + 1}` }, `${key.text} ~ ${len} results in ${referenceDataMap.size} files`, TreeItemCollapsibleState.Expanded, ThemeIcon.Folder, [], '', referenceDataMap),
        )
      }

      return result
    }
  }
}

type ReferenceItemId = HistoryKey | [HistoryKey, string] | [HistoryKey, string, number]

class ReferenceItemRoot extends TreeItem {
  constructor(
    public readonly _id: ReferenceItemId,
    public readonly label: TreeItemLabel,
    public readonly description: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly iconPath: string | Uri | {
      /**
       * The icon path for the light theme.
       */
      light: string | Uri
      /**
       * The icon path for the dark theme.
       */
      dark: string | Uri
    } | ThemeIcon,
    public readonly loc: Location[],
    public readonly filePath: string,
    public readonly referenceDataMap?: ReferenceData,
  ) {
    super (label, collapsibleState)
  }
}

export class ReferenceItem extends TreeItem {
  constructor(
    public readonly _id: ReferenceItemId,
    public readonly uri: Uri,
    public readonly label: TreeItemLabel | string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly iconPath: string | Uri | {
      /**
       * The icon path for the light theme.
       */
      light: string | Uri
      /**
       * The icon path for the dark theme.
       */
      dark: string | Uri
    } | ThemeIcon,
    public command: Command,
    public readonly loc?: Location[],
    public readonly filePath?: string,
  ) {
    super (uri, collapsibleState)
  }
}
