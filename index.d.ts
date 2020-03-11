declare module 'what-the-diff' {
	export type FileMode = '100644' | '100755';
	export type DiffStatus = 'deleted' | 'added' | 'modified' | 'unmerged' | 'copied' | 'renamed';

	export interface Hunk {
		oldStartLine: number;
		oldLineCount: number;
		newStartLine: number;
		newLineCount: number;
		heading: string;
		lines: string[];
	}

	export interface ParsedDiff {
		oldPath: string;
		newPath: string;
		oldMode: FileMode;
		newMode: FileMode;
		status: DiffStatus;
		hunks: Hunk[];
		binary?: boolean;
		similarity?: number;
	}

	export function parse(gitDiff: string): ParsedDiff[];
}
