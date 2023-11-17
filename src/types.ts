import type { Location } from "vscode"

export type ReferenceData = Map<string, Location[]>

export type History = Map<{ index: number, text: string }, ReferenceData>
