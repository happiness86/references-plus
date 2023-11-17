import type { Event, Range, TreeDataProvider } from 'vscode'
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
    if (element) {
      if (!element.range.length)
        return []
      const contents = []
      for (const r of element.range) {
        // const text = window.activeTextEditor?.document.getText(r) || ''
        let text = ''
        if (element.label !== window.activeTextEditor?.document.uri.path) {
          const document = await workspace.openTextDocument(element.label)
          text = document.lineAt(r.start.line).text || ''
        }
        else {
          text = window.activeTextEditor?.document.lineAt(r.start.line).text || ''
        }
        contents.push(new ReferenceItem(text, [], TreeItemCollapsibleState.Collapsed))
      }

      return contents
    }
    else {
      const result = []
      for (const [, referenceDataMap] of this.referenceData) {
        for (const [path, range] of referenceDataMap) {
          result.push(
            new ReferenceItem(path, range, TreeItemCollapsibleState.Expanded),
          )
        }
      }

      return result
    }
  }
}

class ReferenceItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly range: Range[],
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super (label, collapsibleState)
  }
}
