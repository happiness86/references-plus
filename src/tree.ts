import * as path from 'node:path'
import type { Command, Event, Location, TreeDataProvider, TreeItemLabel, Uri } from 'vscode'
import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState, window, workspace } from 'vscode'
import type { History, ReferenceData } from './types'
import { EXT_ID } from './constants'

export class ReferencesPlusTreeDataProvider implements TreeDataProvider<ReferenceItem | ReferenceItemRoot> {
  constructor(public referenceData: History) {
  }

  private _onDidChangeTreeData: EventEmitter<void | ReferenceItem | null | undefined> = new EventEmitter<void | ReferenceItem | null | undefined>()

  onDidChangeTreeData?: Event<void | ReferenceItem | ReferenceItem[] | null | undefined> = this._onDidChangeTreeData.event

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: ReferenceItem): ReferenceItem {
    return element
  }

  async getChildren(element?: ReferenceItem | ReferenceItemRoot | undefined) {
    if (!this.referenceData.size)
      return
    if (element) {
      const contents = []
      if (element.referenceDataMap) {
        for (const [filePath, loc] of element.referenceDataMap) {
          const basename = path.basename(filePath)
          const prefix = workspace.getWorkspaceFolder(loc[0].uri)?.uri.path || ''
          const description = filePath.split(prefix)[1].split(basename)[0].slice(0, -1)
          contents.push(
            new ReferenceItemRoot({ label: basename }, description, TreeItemCollapsibleState.Expanded, '', loc, filePath, undefined),
          )
        }
      }
      else {
        for (const l of element.loc) {
          const r = l.range
          // const text = window.activeTextEditor?.document.getText(r) || ''
          let text = ''
          if (element.filePath !== window.activeTextEditor?.document.uri.path) {
            const document = await workspace.openTextDocument(element.filePath)
            text = document.lineAt(r.start.line).text || ''
          }
          else {
            text = window.activeTextEditor?.document.lineAt(r.start.line).text || ''
          }
          const command: Command = {
            title: 'Open',
            command: `${EXT_ID}.selectNode`,
            arguments: [l],
          }
          contents.push(new ReferenceItem(l.uri, { label: text, highlights: [[r.start.character, r.end.character]] }, '', TreeItemCollapsibleState.None, ThemeIcon.File, command, [], '', undefined))
        }
      }

      return contents
    }
    else {
      const result = []
      for (const [key, referenceDataMap] of this.referenceData) {
        result.push(
          new ReferenceItemRoot({ label: `${key.index + 1}` }, key.text, TreeItemCollapsibleState.Expanded, ThemeIcon.Folder, [], '', referenceDataMap),
        )
      }

      return result
    }
  }
}

class ReferenceItemRoot extends TreeItem {
  constructor(
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

class ReferenceItem extends TreeItem {
  constructor(
    public readonly uri: Uri,
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
    public command: Command,
    public readonly loc: Location[],
    public readonly filePath: string,
    public readonly referenceDataMap?: ReferenceData,
  ) {
    super (uri, collapsibleState)
  }
}
