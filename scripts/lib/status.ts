// Bottom status line with scrolling log above it.
// Invariant: the status line is always the last thing written and never ends with a newline,
// so the cursor sits at the end of it. Log lines clear it, print, and redraw it.

const stream = process.stderr;
const isTTY = Boolean(stream.isTTY);
const CLEAR_LINE = '\r\x1b[2K';

let status = '';
let lastPlainStatus = 0;

// Truncate to terminal width so the status never wraps (wrapped rows can't be cleared).
function fit(text: string): string {
	const width = (stream.columns || 80) - 1;
	return text.length > width ? `${text.slice(0, width - 1)}…` : text;
}

export function log(line: string): void {
	if (isTTY && status) stream.write(`${CLEAR_LINE}${line}\n${fit(status)}`);
	else stream.write(`${line}\n`);
}

export function setStatus(text: string): void {
	status = text;
	if (isTTY) {
		stream.write(`${CLEAR_LINE}${fit(status)}`);
	} else if (Date.now() - lastPlainStatus >= 15_000) {
		lastPlainStatus = Date.now();
		stream.write(`${status}\n`);
	}
}

export function clearStatus(): void {
	if (isTTY && status) stream.write(CLEAR_LINE);
	status = '';
}

export function bar(fraction: number, width = 16): string {
	const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
	return `▕${'█'.repeat(filled)}${'░'.repeat(width - filled)}▏`;
}

export function duration(seconds: number): string {
	const s = Math.floor(seconds);
	const pad = (n: number) => String(n).padStart(2, '0');
	if (s < 3600) return `${Math.floor(s / 60)}m${pad(s % 60)}s`;
	return `${Math.floor(s / 3600)}h${pad(Math.floor((s % 3600) / 60))}m`;
}

process.on('exit', () => {
	if (isTTY && status) stream.write('\n');
});
process.once('SIGINT', () => {
	stream.write(isTTY && status ? '\ninterrupted\n' : 'interrupted\n');
	status = '';
	process.exit(130);
});
