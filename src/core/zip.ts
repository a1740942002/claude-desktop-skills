import { deflateRawSync } from "zlib";

interface ZipEntry {
  name: string;
  data: Buffer;
}

export function createZip(entries: ZipEntry[]): Buffer {
  const centralHeaders: Buffer[] = [];
  const localParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf-8");
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression: deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compressed.length, 18); // compressed size
    localHeader.writeUInt32LE(entry.data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localEntry = Buffer.concat([localHeader, nameBytes, compressed]);
    localParts.push(localEntry);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression: deflate
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc-32
    centralHeader.writeUInt32LE(compressed.length, 20); // compressed size
    centralHeader.writeUInt32LE(entry.data.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBytes.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, 42); // local header offset

    centralHeaders.push(Buffer.concat([centralHeader, nameBytes]));
    offset += localEntry.length;
  }

  const centralDir = Buffer.concat(centralHeaders);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // disk with central directory
  endRecord.writeUInt16LE(entries.length, 8); // entries on this disk
  endRecord.writeUInt16LE(entries.length, 10); // total entries
  endRecord.writeUInt32LE(centralDir.length, 12); // central directory size
  endRecord.writeUInt32LE(offset, 16); // central directory offset
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
