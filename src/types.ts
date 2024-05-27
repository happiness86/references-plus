import type { Location } from 'vscode'

export type ReferenceData = Map<string, Location[]>

export interface HistoryKey { index: number; text: string }

export type History = Map<HistoryKey, ReferenceData>
