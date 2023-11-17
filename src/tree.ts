import * as path from 'node:path'
import type { Event, Location, Range, TreeDataProvider, TreeItemLabel } from 'vscode'
import { EventEmitter, TreeItem, TreeItemCollapsibleState, window, workspace } from 'vscode'
import type { History } from './types'

export class ReferencesPlusTreeDataProvider implements TreeDataProvider<ReferenceItem> {
  constructor(public referenceData: History) {
  }

  private _onDidChangeTreeData: EventEmitter<void | ReferenceItem | null | undefined> = new EventEmitter<void | ReferenceItem | null | undefined>()

  onDidChangeTreeData?: Event<void | ReferenceItem | ReferenceItem[] | null | undefined> = this._onDidChangeTreeData.event

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: ReferenceItem): TreeItem | Thenable<TreeItem> {
    return element
  }

  async getChildren(element?: ReferenceItem | undefined) {
    if (!this.referenceData.size)
      return
    if (element) {
      if (!element.loc.length)
        return
      const contents = []
      const range = element.loc.map(item => item.range)
      for (const r of range) {
        // const text = window.activeTextEditor?.document.getText(r) || ''
        let text = ''
        if (element.filePath !== window.activeTextEditor?.document.uri.path) {
          const document = await workspace.openTextDocument(element.filePath)
          text = document.lineAt(r.start.line).text || ''
        }
        else {
          text = window.activeTextEditor?.document.lineAt(r.start.line).text || ''
        }
        contents.push(new ReferenceItem({ label: text, highlights: [[r.start.character, r.end.character]] }, '', [], '', TreeItemCollapsibleState.None))
      }

      return contents
    }
    else {
      const result = []
      for (const [, referenceDataMap] of this.referenceData) {
        for (const [filePath, loc] of referenceDataMap) {
          const basename = path.basename(filePath)
          const prefix = workspace.getWorkspaceFolder(loc[0].uri)?.uri.path || ''
          const description = filePath.split(prefix)[1].split(basename)[0].slice(0, -1)
          result.push(
            new ReferenceItem({ label: basename }, description, loc, filePath, TreeItemCollapsibleState.Expanded),
          )
        }
      }

      return result
    }
  }
}

class ReferenceItem extends TreeItem {
  constructor(
    public readonly label: TreeItemLabel,
    public readonly description: string,
    public readonly loc: Location[],
    public readonly filePath: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super (label, collapsibleState)
  }
}
