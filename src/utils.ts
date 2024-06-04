import { commands } from 'vscode'
import type { History, HistoryKey } from './types'
import * as vscode from 'vscode';


export class ContextKey<T> {
  constructor(public name: string) {}

  async set(value: T) {
    await commands.executeCommand('setContext', this.name, value)
  }
}

export function resortHistory(history: History) {
  let index = 0
  for (const hisKey of history.keys())
    hisKey.index = index++
}

export function areLocationsEqual(loc1: vscode.Location, loc2: vscode.Location) {
  if (loc1.uri.toString() !== loc2.uri.toString()) {
    return false;
  }

  if (!loc1.range.isEqual(loc2.range)) {
    return false;
  }

  return true;
}