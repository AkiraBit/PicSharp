import { access, constants } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { parse } from "node:path";
import { createHash } from "node:crypto";

export async function hasPermission(
	filePath: string,
	mode: number = constants.F_OK
): Promise<boolean> {
	try {
		await access(filePath, mode);
		return true;
	} catch {
		return false;
	}
}

export async function isReadable(filePath: string): Promise<boolean> {
	return hasPermission(filePath, constants.R_OK);
}

export async function isWritable(filePath: string): Promise<boolean> {
	return hasPermission(filePath, constants.W_OK);
}

export async function isExecutable(filePath: string): Promise<boolean> {
	return hasPermission(filePath, constants.X_OK);
}

export async function exists(filePath: string): Promise<boolean> {
	return hasPermission(filePath);
}

export function getFileName(filePath: string): string {
	const { name, ext } = parse(filePath);
	return `${name}${ext}`;
}

export function hashFile(
	filePath: string,
	algorithm = "md5",
	highWaterMark = 1024 * 1024
) {
	return new Promise<string>((resolve, reject) => {
		const hash = createHash(algorithm);
		const stream = createReadStream(filePath, { highWaterMark });
		stream.on("error", reject);
		hash.on("error", reject);
		stream.on("data", (chunk) => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}
