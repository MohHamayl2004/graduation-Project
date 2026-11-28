// Dependency-free: standalone backend deployments need no frontend files.
export const GESTURES = Object.freeze(['GREETING', 'IDLE', 'LISTENING', 'THINKING', 'EXPLAINING', 'POINTING', 'ENCOURAGING', 'CELEBRATING', 'TALKING_LEFT', 'TALKING_RIGHT', 'SWITCHING_HANDS', 'NEUTRAL']);
export const EMOTIONS = Object.freeze(['neutral', 'happy', 'thoughtful', 'supportive']);
export const normalizeGesture = value => ({ gesture: GESTURES.includes(value?.gesture) ? value.gesture : 'EXPLAINING', emotion: EMOTIONS.includes(value?.emotion) ? value.emotion : 'neutral' });
export const tutorResponseFormat = { type: 'json_schema', json_schema: { name: 'tutor_response', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['text', 'gesture', 'emotion'], properties: {
    text: { type: 'string' }, gesture: { type: 'string', enum: GESTURES }, emotion: { type: 'string', enum: EMOTIONS },
  },
} } };

// Incremental JSON lexer: only the top-level text string reaches chat.
// Escapes may span SSE chunks; metadata is never released as prose.
export class TutorResponseDecoder {
  constructor() { this.raw = ''; this.index = 0; this.depth = 0; this.key = ''; this.string = null; this.token = ''; this.expectKey = false; this.text = ''; this.mode = null; }
  push(chunk) {
    this.raw += chunk;
    if (this.raw.length > 16000) throw new Error('Qwen answer exceeds limit');
    if (!this.mode && this.raw.trimStart()) this.mode = this.raw.trimStart()[0] === '{' ? 'json' : 'plain';
    if (!this.mode) return '';
    if (this.mode === 'plain') { const delta = this.raw.slice(this.index); this.index = this.raw.length; this.text += delta; return delta; }
    let output = '';
    while (this.index < this.raw.length) {
      let c = this.raw[this.index];
      if (this.string) {
        if (c === '"') {
          if (this.string === 'key') this.key = this.token;
          this.string = null; this.index++; continue;
        }
        if (c === '\\') {
          if (this.index + 1 >= this.raw.length) break;
          const size = this.raw[this.index + 1] === 'u' ? 6 : 2;
          if (this.index + size > this.raw.length) break;
          try { c = JSON.parse('"' + this.raw.slice(this.index, this.index + size) + '"'); }
          catch { throw new Error('Invalid Qwen text escape'); }
          this.index += size;
        } else this.index++;
        if (this.string === 'key') this.token += c;
        if (this.string === 'text') output += c;
      } else {
        if (c === '"') {
          this.string = this.depth === 1 && this.expectKey ? 'key' : this.depth === 1 && this.key === 'text' ? 'text' : 'other';
          this.token = ''; this.expectKey = false;
        } else if (c === '{' || c === '[') { this.depth++; if (this.depth === 1) this.expectKey = true; }
        else if (c === '}' || c === ']') this.depth--;
        else if (c === ',' && this.depth === 1) { this.expectKey = true; this.key = ''; }
        this.index++;
      }
    }
    this.text += output; return output;
  }
  metadata() {
    try { return normalizeGesture(this.mode === 'json' ? JSON.parse(this.raw) : null); }
    catch { return normalizeGesture(null); }
  }
}
