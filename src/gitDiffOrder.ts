/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-continue */
/* eslint-disable no-console */

import path from "path";
import { parse as diffParser, ParsedDiff } from "what-the-diff";

import { execAsync } from "./util/execAsync";

function ignore(_foo: any): void {
	//
}

export async function gitDiffOrder(dirPath: string = __dirname): Promise<void> {
	/** TODO types */
	/** TODO */

	// eslint-disable-next-line no-param-reassign
	dirPath = "~/projects/turbo-schedule";

	const rawGitDiff: string = await execAsync(`cd ${dirPath} && git diff`, { encoding: "utf-8" });

	if (!rawGitDiff) {
		console.log("Working directory clean");
		return;
	}

	const diffs: ParsedDiff[] = diffParser(rawGitDiff);

	/**
	 * TODO - we probably need only either one of these
	 */
	let addedDependencies: Dependency[] = [];
	let removedDependencies: Dependency[] = [];

	for (const diff of diffs) {
		console.log("diff\n", diff);

		if (diff.status !== "modified") {
			continue;
		}

		let newPathAbs: string = diff.newPath
			.split("/")
			.splice(1)
			.join("/");

		newPathAbs = path.join(dirPath, newPathAbs);

		for (const hunk of diff.hunks) {
			for (const line of hunk.lines) {
				console.log("line", line);

				if (line[0] !== "+") {
					if (line[0] !== "-") {
						continue;
					} else {
						removedDependencies = [...removedDependencies, ...parseDependencies(line, newPathAbs, dirPath)];
					}
				} else {
					addedDependencies = [...addedDependencies, ...parseDependencies(line, newPathAbs, dirPath)];
				}
			}
		}
	}

	for (const dependency of addedDependencies) {
		for (const otherDependency of addedDependencies) {
			if (dependency.name === otherDependency.name && dependency.filePath === otherDependency.filePath) {
				continue;
			}

			if (
				dependency.importedFromPath === otherDependency.filePath && //
				dependency.name === otherDependency.name
			) {
				dependency.children.push(otherDependency);
			}
		}
	}

	console.log("addedDependencies", addedDependencies);
}

export interface Dependency {
	filePath: string;
	name: string;
	importedFromPath: string;
	children: Dependency[];
}

export type DependencyParser = (line: string) => Dependency[];

export function parseDependencies(
	line: string,
	filePath: string,
	dirPath: string,
	dependencyParsers: DependencyParser[] = createDependencyParsers(filePath, dirPath)
): Dependency[] {
	for (const parser of dependencyParsers) {
		const parsedDeps: Dependency[] = parser(line);

		if (!parsedDeps.length) {
			continue;
		}

		return parsedDeps;
	}

	return [];
}

export function createDependencyParsers(filePath: string, dirPath: string): DependencyParser[] {
	const dependencyParsers: DependencyParser[] = [
		(line: string) => {
			let parsed: RegExpExecArray | null = null;

			const importRegex: RegExp = /import (.*) from (.*)/gi;

			const testOutput: boolean = importRegex.test(line);
			importRegex.lastIndex = 0;

			if (!testOutput) {
				console.log("test fail");
				return [];
			}

			parsed = importRegex.exec(line);
			importRegex.lastIndex = 0;

			if (!parsed) {
				console.log("parsed fail");
				return [];
			}

			console.log("parsed succ", parsed);

			const [_match, depNamesRaw, importPathRaw] = parsed;
			ignore(_match);

			/**
			 * TODO
			 * 1. default export
			 * 2. destructured export
			 * 3. both
			 */
			const depNames: string[] = depNamesRaw
				.split(",")
				.map((value) => value.replace(/[{}]/gi, "")) /** TODO */
				.map((value) => value.trim())
				.filter((value) => !!value);

			/**
			 * TODO FIXME resolve the path
			 */
			let importPath: string = importPathRaw
				.replace(";", "")
				.replace(/^['"`]/, "")
				.replace(/['"`]$/, "");

			/**
			 * TODO FIXME - this does not handle
			 * * `node_modules`,
			 * * typescript's project references,
			 * * yarn workspaces,
			 * * etc.!
			 *
			 */
			importPath = path.join(dirPath, importPath);

			console.log("depNames", depNames);
			console.log("importPathRaw", importPath);

			const dependencies: Dependency[] = [];

			for (const depName of depNames) {
				const dependency: Dependency = {
					name: depName,
					filePath: filePath,
					children: [],
					importedFromPath: importPath,
				};

				dependencies.push(dependency);
			}

			// for (const regex of regexes) {
			// 	if (!regex.test(line)) {
			// 		continue;
			// 	}

			// 	const parsed: RegExpExecArray | null = regex.exec(line);

			// 	if (!parsed) {
			// 		continue;
			// 	}

			// 	parsed[0]
			// }

			return dependencies;
		},
		(_line: string): [] => [],
	];

	return dependencyParsers;
}
