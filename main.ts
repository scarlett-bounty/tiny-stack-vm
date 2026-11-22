// Tiny stack VM (ISA v1).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const inDir = process.env.MAKEFUN_INPUT_DIR || "/input";
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const MAX_STEPS = 1000000;
const MAX_OUT = 65536;

function run(prog, input) {
  const st = [];
  const cs = [];
  const mem = new Int32Array(256);
  const out = [];
  let pc = 0;
  let steps = 0;
  let ip = 0;
  try {
    for (;;) {
      if (steps >= MAX_STEPS) throw 10;
      if (pc < 0 || pc >= prog.length) throw 9;
      const op = prog[pc];
      const known =
        op <= 0x07 ||
        (op >= 0x10 && op <= 0x22) ||
        (op >= 0x30 && op <= 0x34) ||
        (op >= 0x40 && op <= 0x41) ||
        (op >= 0x50 && op <= 0x53);
      if (!known) throw 5;
      const imm = op === 0x01 ? 1 : op === 0x02 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
      if (pc + 1 + imm > prog.length) throw 9;
      steps++;
      let next = pc + 1 + imm;
      switch (op) {
        case 0x00: // HALT
          return { out, code: 0 };
        case 0x01: { // PUSH8: byte sign-extended
          if (st.length >= 256) throw 3;
          let v = prog[pc + 1];
          if (v >= 128) v -= 256;
          st.push(v);
          break;
        }
        case 0x02: // PUSH32: four bytes, little-endian, signed
          if (st.length >= 256) throw 3;
          st.push(prog[pc + 1] | (prog[pc + 2] << 8) | (prog[pc + 3] << 16) | (prog[pc + 4] << 24));
          break;
        case 0x03: // POP
          if (st.length < 1) throw 2;
          st.pop();
          break;
        case 0x04: // DUP
          if (st.length < 1) throw 2;
          if (st.length >= 256) throw 3;
          st.push(st[st.length - 1]);
          break;
        case 0x05: { // SWAP
          if (st.length < 2) throw 2;
          const t = st[st.length - 1];
          st[st.length - 1] = st[st.length - 2];
          st[st.length - 2] = t;
          break;
        }
        case 0x06: // OVER
          if (st.length < 2) throw 2;
          if (st.length >= 256) throw 3;
          st.push(st[st.length - 2]);
          break;
        case 0x07: { // ROT: ( a b c -- b c a )
          if (st.length < 3) throw 2;
          const a = st[st.length - 3];
          st[st.length - 3] = st[st.length - 2];
          st[st.length - 2] = st[st.length - 1];
          st[st.length - 1] = a;
          break;
        }
        case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
        case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
        case 0x20: case 0x21: case 0x22: { // two-operand ops
          if (st.length < 2) throw 2;
          const b = st.pop();
          const a = st.pop();
          let r;
          if (op === 0x10) r = (a + b) | 0;
          else if (op === 0x11) r = (a - b) | 0;
          else if (op === 0x12) r = Math.imul(a, b);
          else if (op === 0x13) { if (b === 0) throw 4; r = (a / b) | 0; }
          else if (op === 0x14) { if (b === 0) throw 4; r = (a % b) | 0; }
          else if (op === 0x15) { if (b === 0) throw 4; r = ((a >>> 0) / (b >>> 0)) | 0; }
          else if (op === 0x16) { if (b === 0) throw 4; r = ((a >>> 0) % (b >>> 0)) | 0; }
          else if (op === 0x18) r = a & b;
          else if (op === 0x19) r = a | b;
          else if (op === 0x1a) r = a ^ b;
          else if (op === 0x1c) r = a << (b & 31);
          else if (op === 0x1d) r = a >> (b & 31);
          else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
          else if (op === 0x20) r = a === b ? 1 : 0;
          else if (op === 0x21) r = a < b ? 1 : 0;
          else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
          st.push(r);
          break;
        }
        case 0x17: // NEG, wraps
          if (st.length < 1) throw 2;
          st[st.length - 1] = (-st[st.length - 1]) | 0;
          break;
        case 0x1b: // NOT
          if (st.length < 1) throw 2;
          st[st.length - 1] = ~st[st.length - 1];
          break;
        case 0x30: { // JMP: signed offset from the next instruction
          let off = prog[pc + 1] | (prog[pc + 2] << 8);
          off = (off << 16) >> 16;
          next = pc + 3 + off;
          break;
        }
        case 0x31: case 0x32: { // JZ / JNZ
          if (st.length < 1) throw 2;
          const v = st.pop();
          if ((op === 0x31 && v === 0) || (op === 0x32 && v !== 0)) {
            let off = prog[pc + 1] | (prog[pc + 2] << 8);
            off = (off << 16) >> 16;
            next = pc + 3 + off;
          }
          break;
        }
        case 0x33: { // CALL: unsigned absolute target
          if (cs.length >= 64) throw 7;
          cs.push(pc + 3);
          next = prog[pc + 1] | (prog[pc + 2] << 8);
          break;
        }
        case 0x34: // RET
          if (cs.length === 0) throw 8;
          next = cs.pop();
          break;
        case 0x40: { // LOAD
          if (st.length < 1) throw 2;
          const addr = st.pop();
          if (addr < 0 || addr > 255) throw 6;
          st.push(mem[addr]);
          break;
        }
        case 0x41: { // STORE: ( v addr -- )
          if (st.length < 2) throw 2;
          const addr = st.pop();
          const v = st.pop();
          if (addr < 0 || addr > 255) throw 6;
          mem[addr] = v;
          break;
        }
        case 0x50: { // PRINT: decimal ASCII, no newline
          if (st.length < 1) throw 2;
          const s = String(st.pop());
          if (out.length + s.length > MAX_OUT) throw 11;
          for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
          break;
        }
        case 0x51: { // PUTC: one byte, v AND 255
          if (st.length < 1) throw 2;
          if (out.length + 1 > MAX_OUT) throw 11;
          out.push(st.pop() & 255);
          break;
        }
        case 0x52: // IN: next input byte, or -1 when used up
          if (st.length >= 256) throw 3;
          st.push(ip < input.length ? input[ip++] : -1);
          break;
        case 0x53: { // EXIT: code v AND 255
          if (st.length < 1) throw 2;
          return { out, code: st.pop() & 255 };
        }
      }
      pc = next;
    }
  } catch (c) {
    return { out, code: typeof c === "number" ? c : 9 };
  }
}

const ids = readdirSync(inDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const id of ids) {
  const prog = readFileSync(inDir + "/" + id + "/program.bin");
  const inPath = inDir + "/" + id + "/input.bin";
  const input = existsSync(inPath) ? readFileSync(inPath) : Buffer.alloc(0);
  const { out, code } = run(prog, input);
  mkdirSync(outDir + "/" + id, { recursive: true });
  writeFileSync(outDir + "/" + id + "/stdout.bin", Buffer.from(out));
  writeFileSync(outDir + "/" + id + "/exit.txt", code + "\n");
}
