// Converts the original's ant sprites (8-bit BMP) into PNGs with the
// bottom-left colour made transparent, as the Delphi controls drew them.
// Usage: node scripts/sprites.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const SOURCE = new URL(
	"../../../packages/ant-spec/evidence/images/",
	import.meta.url,
);
const TARGET = new URL("../public/sprites/", import.meta.url);
const NAMES = { sus: "up", jos: "down", stinga: "left", dreapta: "right" };

function readBmp(bytes) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const offset = view.getUint32(10, true);
	const width = view.getInt32(18, true);
	const height = view.getInt32(22, true);
	if (view.getUint16(28, true) !== 8 || height <= 0)
		throw new Error("expected a bottom-up 8-bit BMP");
	const palette = 14 + view.getUint32(14, true);
	const stride = Math.ceil(width / 4) * 4;
	const transparent = bytes[offset];
	const rgba = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const index = bytes[offset + (height - 1 - y) * stride + x];
			const p = palette + index * 4;
			const o = (y * width + x) * 4;
			rgba[o] = bytes[p + 2];
			rgba[o + 1] = bytes[p + 1];
			rgba[o + 2] = bytes[p];
			rgba[o + 3] = index === transparent ? 0 : 255;
		}
	return { width, height, rgba };
}

function chunk(type, data) {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(data.length, 0);
	head.write(type, 4, "ascii");
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
	return Buffer.concat([head, data, crc]);
}

function png({ width, height, rgba }) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
	const rows = Buffer.alloc((width * 4 + 1) * height);
	for (let y = 0; y < height; y++)
		rgba.copy(
			rows,
			y * (width * 4 + 1) + 1,
			y * width * 4,
			(y + 1) * width * 4,
		);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(rows)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

mkdirSync(TARGET, { recursive: true });
for (const [from, to] of Object.entries(NAMES)) {
	const image = readBmp(readFileSync(new URL(`${from}.bmp`, SOURCE)));
	writeFileSync(new URL(`${to}.png`, TARGET), png(image));
	console.log(
		`${from}.bmp -> sprites/${to}.png (${image.width}×${image.height})`,
	);
}
