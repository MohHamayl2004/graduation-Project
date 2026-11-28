// Optional PCM/IEEE-float WAV metadata. Unsupported or truncated audio remains
// playable, but is never assigned an invented duration or phoneme timeline.
export function readWavMetadata(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return null;
  const end = bytes.readUInt32LE(4) + 8;
  if (end > bytes.length || end < 44) return null;
  let format, dataBytes = 0;
  for (let offset = 12; offset + 8 <= end;) {
    const size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > end) return null;
    const name = bytes.toString('ascii', offset, offset + 4);
    if (name === 'fmt ' && size >= 16) {
      const encoding = bytes.readUInt16LE(start), channels = bytes.readUInt16LE(start + 2), sampleRate = bytes.readUInt32LE(start + 4), byteRate = bytes.readUInt32LE(start + 8), align = bytes.readUInt16LE(start + 12), bits = bytes.readUInt16LE(start + 14);
      if (![1, 3].includes(encoding) || channels < 1 || channels > 8 || !sampleRate || sampleRate > 384000 || ![8, 16, 24, 32, 64].includes(bits) || (encoding === 3 && ![32, 64].includes(bits)) || align !== channels * bits / 8 || byteRate !== sampleRate * align) return null;
      format = { channels, sampleRate, byteRate, align };
    }
    if (name === 'data') dataBytes += size;
    offset = start + size + (size % 2);
  }
  if (!format || !dataBytes || dataBytes % format.align) return null;
  return { durationSeconds: dataBytes / format.byteRate, sampleRate: format.sampleRate, channels: format.channels };
}
