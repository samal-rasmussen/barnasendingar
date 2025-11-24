import { spawn } from 'child_process';
import os from 'os';

const PLATFORM = os.platform();
// String marker printed by the child process once the wake lock is actually
// acquired. We listen for this exact token on stdout so `keepAwake()` only
// resolves after the platform-specific tool has successfully taken the lock.
const READY_SIGNAL = 'LOCK_ACQUIRED';
// Infinite sleep that works on BSD + GNU: 1 day loop.
// We keep a trivial shell process alive so that:
//   - On Linux, `systemd-inhibit` keeps the inhibitor for as long as the
//     wrapped command (this shell) is running.
//   - On macOS, `caffeinate` keeps the power assertion for as long as the
//     wrapped command is running.
// The loop itself is effectively free in terms of CPU and RAM: the process
// spends almost all of its time blocked in `sleep`, waking once per day to
// start another `sleep`.
const INFINITE_SLEEP = 'while :; do sleep 86400; done';

function buildWakeCommand() {
	switch (PLATFORM) {
		case 'linux':
			return {
				command: 'systemd-inhibit',
				args: [
					'--what=idle:sleep',
					'--who=NodeScript',
					'--why=Background Task',
					'--mode=block',
					'sh',
					'-c',
					`echo ${READY_SIGNAL}; ${INFINITE_SLEEP}`,
				],
			};

		case 'darwin':
			return {
				command: 'caffeinate',
				args: ['-d', '-i', 'sh', '-c', `echo ${READY_SIGNAL}; ${INFINITE_SLEEP}`],
			};

		case 'win32': {
			const psScript = `
        $code = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);';
        $type = Add-Type -MemberDefinition $code -Name "Win32" -Namespace Win32 -PassThru;
        while ($true) {
          $type::SetThreadExecutionState(0x80000001); # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
          Write-Output "${READY_SIGNAL}";
          Start-Sleep -Seconds 60;
        }
      `.trim();

			return {
				command: 'powershell.exe',
				args: ['-NoProfile', '-NonInteractive', '-Command', psScript],
			};
		}

		default:
			throw new Error(`PLATFORM ${PLATFORM} not supported`);
	}
}

/**
 * Prevents the computer from sleeping by holding a PLATFORM-specific wake lock.
 * Resolves once the lock has been successfully acquired.
 *
 */
export function keepAwake(): Promise<{ pid: number; release: () => boolean }> {
	const { command, args } = buildWakeCommand();

	return new Promise((resolve, reject) => {
		let resolved = false;

		let child;
		try {
			child = spawn(command, args, {
				windowsHide: true,
				stdio: ['ignore', 'pipe', 'ignore'],
			});
		} catch (err) {
			return reject(new Error(`Failed to start wake-lock process: ${err.message}`));
		}

		const cleanup = () => {
			child.stdout.off('data', onData);
			child.off('error', onError);
			child.off('exit', onExit);
		};

		// Buffer stdout chunks to handle cases where READY_SIGNAL might be split
		// across multiple 'data' events
		let stdoutBuffer = '';
		const onData = (data: Buffer) => {
			if (resolved) return;
			// Append new chunk to buffer and check if READY_SIGNAL appears
			// anywhere in the accumulated buffer
			stdoutBuffer += data.toString();
			if (!stdoutBuffer.includes(READY_SIGNAL)) return;

			resolved = true;
			cleanup();
			resolve({
				pid: child.pid,
				release: () => {
					if (child.killed) return false;
					child.kill();
					return true;
				},
			});
		};

		const onError = (err) => {
			if (resolved) return;
			resolved = true;
			cleanup();
			reject(new Error(`Failed to start wake-lock process: ${err.message}`));
		};

		const onExit = (code, signal) => {
			if (resolved) return; // normal release/exit after ready is fine
			resolved = true;
			cleanup();
			reject(
				new Error(
					`Wake-lock process exited prematurely` +
						(code !== null ? ` with code ${code}` : '') +
						(signal ? `, signal ${signal}` : ''),
				),
			);
		};

		child.stdout.on('data', onData);
		child.on('error', onError);
		child.on('exit', onExit);
	});
}

// Example usage:
// (async () => {
// 	try {
// 		console.log('Setting up wake lock...');
// 		const wakeLock = await keepAwake();
// 		console.log('Success! Computer will not sleep.');

// 		// Your long-running task here
// 		await new Promise((r) => setTimeout(r, 5000));

// 		console.log('Releasing lock...');
// 		wakeLock.release();
// 	} catch (err) {
// 		console.error('Error:', err.message);
// 	}
// })();
