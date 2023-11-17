import type { Range } from "vscode"

export type ReferenceData = Map<string, Range[]>

export type History = Map<number, ReferenceData>
