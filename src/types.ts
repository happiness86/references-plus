import type { Location } from "vscode"

export type ReferenceData = Map<string, Location[]>

export type History = Map<number, ReferenceData>
