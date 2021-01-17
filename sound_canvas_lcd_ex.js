import {SoundCanvasLcd} from './sound_canvas_lcd.js';

function makeEnvelope(attackTime, decayTime, sustainLevel, releaseTime, isRxNoteOff) {
	function reciprocal(value) {
		return (value !== 0) ? 1.0 / value : Infinity;
	}

	if (isRxNoteOff) {
		const decayReleaseTime = reciprocal(reciprocal(decayTime) + reciprocal(releaseTime));
		console.assert(Number.isFinite(decayReleaseTime));

		return (currentTime, noteOnTime, noteOffTime = 0) => {
			console.assert(currentTime >= noteOnTime);
			if (currentTime < noteOnTime || noteOnTime <= 0) {
				console.assert(currentTime >= noteOnTime);
				return 0;
			}

			const noteOnDuration = currentTime - noteOnTime;
			if (noteOnDuration < attackTime) {
				if (noteOffTime === 0) {
					// Attack phase
					console.assert(noteOnDuration / attackTime <= 1.0);
					return noteOnDuration / attackTime;
				} else {
					// Decay & Release phase
					const volume = noteOnDuration / attackTime;
					const gateDuration = noteOffTime - noteOnTime;
					return Math.max((1.0 - gateDuration / decayReleaseTime) * volume, 0.0);
				}
			} else if (noteOnDuration < attackTime + decayTime) {
				const decayDuration = noteOnDuration - attackTime;
				const volume = 1.0 - (decayDuration / decayTime) * (1.0 - sustainLevel);
				if (noteOffTime === 0) {
					// Decay phase
					console.assert(volume >= sustainLevel);
					return volume;
				} else {
					// Decay & Release phase
					// Note: If the current volume is lower than sustain level, the only release time should be used to calculate it.
					const gateDuration = noteOffTime - noteOnTime;
					return Math.max((1.0 - gateDuration / decayReleaseTime) * volume, 0.0);
				}
			} else {
				if (noteOffTime === 0) {
					// Sustain phase
					return sustainLevel;
				} else {
					// Release phase
					console.assert(currentTime >= noteOffTime);
					const noteOffDuration = currentTime - noteOffTime;
					return Math.max((1.0 - noteOffDuration / releaseTime) * sustainLevel, 0.0);
				}
			}
		};
	} else {
		console.assert(sustainLevel === 0.0);
		return (currentTime, noteOnTime) => {
			console.assert(currentTime >= noteOnTime);
			if (currentTime < noteOnTime || noteOnTime <= 0) {
				console.assert(currentTime >= noteOnTime);
				return 0;
			}

			const noteOnDuration = currentTime - noteOnTime;
			if (noteOnDuration < attackTime) {
				// Attack phase
				console.assert(noteOnDuration / attackTime <= 1.0);
				return noteOnDuration / attackTime;
			} else {
				// Decay phase
				const decayDuration = noteOnDuration - attackTime;
				return Math.max(1.0 - decayDuration / decayTime, 0.0);
			}
		};
	}
}

const getToneEnvelopeLevel = makeEnvelope(100, 1000, 0.7, 500, true);
const getDrumEnvelopeLevel = makeEnvelope(0, 1000, 0, 0, false);

const getPeakHoldLevelFuncs = Object.freeze([...new Array(4)].map((_, type) => {
	const PEAK_HOLD_TIME = 500;
	const PEAK_STEP_TIME = 200;

	switch (type) {
	case 0x00:
		return () => 0;

	case 0x01:
	case 0x03:
		return (elapsedTime, peakLevel) => {
			console.assert(elapsedTime >= 0);
			if (elapsedTime < PEAK_HOLD_TIME) {
				return peakLevel;
			} else {
				return Math.max(peakLevel - Math.trunc((elapsedTime - PEAK_HOLD_TIME) / PEAK_STEP_TIME), 0);
			}
		};

	case 0x02:
		return (elapsedTime, peakLevel) => (elapsedTime < PEAK_HOLD_TIME) ? peakLevel : 0;

	default:
		console.assert(false);
		return null;
	}
}));

const rearrangeBitmapStrFuncs = Object.freeze({
	1: (str) => str,
	2: (() => {
		const tables = [...new Array(16)].map((_, i) => [i * 2 + 32, i * 2 + 33, i * 2, i * 2 + 1]).flat();
		return (str) => str.split('').map((_, i, a) => a[tables[i]]).join('');
	})(),
	4: (() => {
		const tables = [...new Array(16)].map((_, i) => [i + 48, i + 32, i + 16, i]).flat();
		return (str) => str.split('').map((_, i, a) => a[tables[i]]).join('');
	})(),
});

function reverseBits(bit, len) {
	console.assert(len === 16 || len === 8 || len === 4 || len === 2);

	bit &= (1 << len) - 1;

	switch (len) {
	case 16:
		bit = ((bit & 0x00ff) << 8) | ((bit & 0xff00) >> 8);
		/* FALLTHRU */
	case 8:
		bit = ((bit & 0x0f0f) << 4) | ((bit & 0xf0f0) >> 4);
		/* FALLTHRU */
	case 4:
		bit = ((bit & 0x3333) << 2) | ((bit & 0xcccc) >> 2);
		/* FALLTHRU */
	case 2:
		bit = ((bit & 0x5555) << 1) | ((bit & 0xaaaa) >> 1);
		break;

	default:
		console.assert(false);
		break;
	}

	return bit;
}

function checkSumError(bytes) {
	console.assert(bytes && bytes.length);
	return (bytes.reduce((p, c) => p + c) % 0x80 !== 0);
}

function block2part(blockNo) {
	console.assert(0 <= blockNo && blockNo < 16);
	return [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][blockNo];
}

function getPartNo(portNo, addrH, addrM) {
	console.assert(portNo >= 0);
	console.assert(addrH === 0x40 || addrH === 0x50);
	console.assert(0x10 <= addrM && addrM <= 0x1f);
	if (portNo < 2) {
		return ((portNo * 0x10) ^ (addrH - 0x40)) + block2part(addrM & 0x0f);
	} else {
		return (addrH === 0x40) ? portNo * 0x10 + block2part(addrM & 0x0f) : -1;
	}
}

function makeDisplayedLetterStr(bytes) {
	console.assert(bytes && bytes.length);
	const str = String.fromCharCode(...bytes.map((byte) => (0x20 <= byte && byte <= 0x7f) ? byte : 0x20));
	return str.replace('\x7e', '→').replace('\x7f', '←');
}

/* eslint-disable no-underscore-dangle, no-use-before-define */
const [processCheckSumErrorForRoland, processCheckSumErrorForYamaha] = [5, 4].map((index) => (self, bytes) => {
	console.assert(bytes && bytes.length);
	const isCheckSumError = checkSumError(bytes.slice(index, -1));
	if (isCheckSumError) {
		self.displayLetter('Check Sum Error!');
	}
	return isCheckSumError;
});

function makeSystemParamHandler(paramName, index, isCheckSum = false) {
	return (self, bytes) => {
		if (isCheckSum && processCheckSumErrorForRoland(self, bytes)) {
			return;
		}

		self._system[paramName] = bytes[index];
		self._updateDisplayedParameter(paramName);
	};
}

function makeYamahaDisplayDotDataHandler(isCheckSum = false) {
	return (self, bytes) => {
		if (isCheckSum && processCheckSumErrorForYamaha(self, bytes)) {
			return;
		}

		const addrL = bytes[6];
		const dataBytes = bytes.slice(7, -1).map((byte) => byte & 0x7f);
		let dotDataBytes = dataBytes;
		if (addrL !== 0x00 || dataBytes.length !== 48) {
			const oldDotDataBytes = [...new Array(48)].map((_, i) => (self._lcd.displayedDotDataPages[0][i % 16] << (Math.trunc(i / 16) * 7) >> 9) & 0x7f);
			dotDataBytes = [...oldDotDataBytes.slice(0, addrL), ...dataBytes, ...oldDotDataBytes.slice(addrL + dataBytes.length, 48)];
			console.assert(dotDataBytes.length === 48);
		}
		const bits = [...new Array(16)].map((_, i) => (dotDataBytes[i] << 9) | (dotDataBytes[i + 16] << 2) | (dotDataBytes[i + 32] >> 5));
		self._lcd.displayedDotDataPages[0] = bits;
		self.displayDotData(bits);
	};
}

// SysEx parsers
const parsers = Object.freeze([
	// Reset
	{
		// GM Level 1, 2, Off
		regexp: /^f0 7e .. 09 0[1-3] f7$/u,
		handler: (self, _) => {
			self.reset(SoundCanvasLcdEx.initialParameters.gs);
			self.setColorScheme(self._settings.defaultColor);
		},
	},
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 00 7f (?:00|7f) .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.reset(SoundCanvasLcdEx.initialParameters.gs);
			self.setColorScheme('orange');
		},
	},
	{
		// SC-88
		regexp: /^f0 41 [01]. 42 12 00 00 7f 0[01] .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			self.reset(SoundCanvasLcdEx.initialParameters.gs);
			self.setColorScheme('orange');

			const mode = bytes[8];
			self.displayLetter(`Mode ${mode + 1}`);
			if (mode === 0x01) {
				self.displayType |= 0x04;
			}
		},
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 00 00 7e 00 f7$/u,
		handler: (self, _) => {
			self.reset(SoundCanvasLcdEx.initialParameters.xg);
			self.setColorScheme('green');
		},
	},
	{
		// MT-32
		regexp: /^f0 41 [01]. 16 12 7f .. .. .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.reset(SoundCanvasLcdEx.initialParameters.mt);
			self.setColorScheme('darkgreen');
		},
	},
	{
		// 05R/W / X5DR
		regexp: /^f0 42 3. 36 4e 0[0-5] 00 f7$/u,
		handler: (self, _) => {
			self.reset({delayVar: 0});
			self.setColorScheme(self._settings.defaultColor);
		},
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 00 0[0-5] f7$/u,
		handler: (self, _) => {
			self.reset({delayVar: 0});
			self.setColorScheme(self._settings.defaultColor);
		},
	},
	{
		// GMega / GMega LX
		regexp: /^f0 40 0. 10 00 08 00 00 00 0. 0. f7$/u,
		handler: (self, bytes) => {
			const value = ((bytes[9] & 0x0f) << 4) | (bytes[10] & 0x0f);
			if (0 <= value && value <= 2) {
				self.reset({chorus: 0, delayVar: 0, deviceId: 0x00});
				self.setColorScheme(self._settings.defaultColor);
			}
		},
	},
	{
		// SG01
		regexp: /^f0 47 10 42 5d 40 00 7f 00 f7$/u,
		handler: (self, _) => {
			self.reset(SoundCanvasLcdEx.initialParameters.gs);
			self.setColorScheme('orange');
		},
	},
	{
		// SD-90/80
		regexp: /^f0 41 10 00 48 12 00 00 00 00 00 .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.reset({reverb: 100, chorus: 127, delayVar: 0});
			self.setColorScheme(self._settings.defaultColor);
		},
	},
	{
		// SD-50
		regexp: /^f0 41 10 00 00 4a 12 01 00 00 00 0[1-4] .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const mode = bytes[11];
			self.reset(SoundCanvasLcdEx.initialParameters.gs);
			self.setColorScheme((mode === 0x04) ? 'orange' : self._settings.defaultColor);
		},
	},

	// Master Volume
	{
		// Universal SysEx
		regexp: /^f0 7f 7f 04 01 .. .. f7$/u,
		handler: makeSystemParamHandler('volume', 6),
	},
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 00 04 .. .. f7$/u,
		handler: makeSystemParamHandler('volume', 8, true),
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 00 00 04 .. f7$/u,
		handler: makeSystemParamHandler('volume', 7),
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 00 00 04 .. f7$/u,
		handler: makeSystemParamHandler('volume', 8),
	},
	{
		// GMouse
		regexp: /^f0 40 0. 10 00 0a 00 0a 00 0. 0. f7$/u,
		handler: (self, bytes) => {
			const value = ((bytes[9] & 0x0f) << 4) | (bytes[10] & 0x0f);
			if (0 <= value && value < 128) {
				self._system.volume = value;
				self._updateDisplayedParameter('volume');
			}
		},
	},
	{
		// SG01
		regexp: /^f0 47 10 42 5d 40 00 04 .. f7$/u,
		handler: makeSystemParamHandler('volume', 8),
	},

	// Reverb
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 01 33 .. .. f7$/u,
		handler: makeSystemParamHandler('reverb', 8, true),
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 02 01 0c .. f7$/u,
		handler: makeSystemParamHandler('reverb', 7),
	},

	// Chorus
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 01 3a .. .. f7$/u,
		handler: makeSystemParamHandler('chorus', 8, true),
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 02 01 2c .. f7$/u,
		handler: makeSystemParamHandler('chorus', 7),
	},

	// Delay/Variation
	{
		// SC-88 or later
		regexp: /^f0 41 [01]. 42 12 40 01 58 .. .. f7$/u,
		handler: makeSystemParamHandler('delayVar', 8, true),
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 02 01 56 .. f7$/u,
		handler: makeSystemParamHandler('delayVar', 7),
	},

	// Master Pan
	{
		// Universal SysEx
		regexp: /^f0 7f 7f 04 02 .. .. f7$/u,
		handler: makeSystemParamHandler('pan', 6),
	},
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 00 06 .. .. f7$/u,
		handler: makeSystemParamHandler('pan', 8, true),
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 00 00 06 .. f7$/u,
		handler: makeSystemParamHandler('pan', 8),
	},

	// Master Key Shift
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 00 05 .. .. f7$/u,
		handler: makeSystemParamHandler('keyShift', 8, true),
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 00 00 06 .. f7$/u,
		handler: makeSystemParamHandler('keyShift', 7),
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 00 00 05 .. f7$/u,
		handler: makeSystemParamHandler('keyShift', 8),
	},
	{
		// SG01
		regexp: /^f0 47 10 42 5d 40 00 05 .. f7$/u,
		handler: makeSystemParamHandler('keyShift', 8),
	},

	// Rx. Port
	{
		// SC-88 or later
		regexp: /^f0 41 [01]. 42 12 00 01 [0-3]. .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const partNo = (bytes[7] & 0x30) + block2part(bytes[7] & 0x0f);
			self._parts[partNo].rxPortNo = bytes[8];
		},
	},

	// Rx. Channel
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 [45]0 1. 02 .. .. f7$/u,
		handler: (self, bytes, portNo = 0) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const partNo = getPartNo(portNo, bytes[5], bytes[6]);
			if (0 <= partNo && partNo < 64) {
				self._parts[partNo].rxChannelNo = bytes[8];
			}
		},
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 08 [0-3]. 04 .. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[5];
			console.assert(0 <= partNo && partNo < 64);
			const portNo = Math.trunc(bytes[7] / 16);
			const channelNo = bytes[7] % 16;
			self._parts[partNo].rxPortNo = portNo;
			self._parts[partNo].rxChannelNo = channelNo;
		},
	},
	{
		// GMega
		regexp: /^f0 40 0. 10 00 08 01 01 [01]. 0. 0. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[8];
			console.assert(0 <= partNo && partNo < 32);
			const value = ((bytes[9] & 0x0f) << 4) | (bytes[10] & 0x0f);
			if (0 <= value && value < 32) {
				self._parts[partNo].rxChannelNo = value;
			}
		},
	},
	{
		// SG01
		regexp: /^f0 47 10 42 5d 40 1. 02 .. f7$/u,
		handler: (self, bytes) => {
			const partNo = getPartNo(0, bytes[5], bytes[6]);
			if (0 <= partNo && partNo < 16) {
				self._parts[partNo].rxChannelNo = bytes[8];
			}
		},
	},

	// Rhythm Part
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 [45]0 1. 15 .. .. f7$/u,
		handler: (self, bytes, portNo = 0) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const partNo = getPartNo(portNo, bytes[5], bytes[6]);
			if (0 <= partNo && partNo < 64) {
				self._parts[partNo].isRhythmPart = (bytes[8] !== 0x00);
			}
		},
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 08 [0-3]. 07 .. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[5];
			console.assert(0 <= partNo && partNo < 64);
			self._parts[partNo].isRhythmPart = (bytes[7] !== 0x00);
		},
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 01 [01]. 0a .. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[6];
			console.assert(0 <= partNo && partNo < 32);
			self._parts[partNo].isRhythmPart = (bytes[8] !== 0x00);
		},
	},

	// Part Volume
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 [45]0 1. 19 .. .. f7$/u,
		handler: (self, bytes, portNo = 0) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const partNo = getPartNo(portNo, bytes[5], bytes[6]);
			if (0 <= partNo && partNo < 64) {
				self._parts[partNo].volume = bytes[8];
			}
		},
	},
	{
		// XG
		regexp: /^f0 43 1. 4c 08 [0-3]. 0b .. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[5];
			console.assert(0 <= partNo && partNo < 64);
			self._parts[partNo].volume = bytes[7];
		},
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 01 [01]. 10 .. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[6];
			console.assert(0 <= partNo && partNo < 32);
			self._parts[partNo].volume = bytes[8];
		},
	},
	{
		// GMega
		regexp: /^f0 40 0. 10 00 08 01 02 [01]. 0. 0. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[8];
			console.assert(0 <= partNo && partNo < 32);
			const value = ((bytes[9] & 0x0f) << 4) | (bytes[10] & 0x0f);
			if (0 <= value && value < 128) {
				self._parts[partNo].volume = value;
			}
		},
	},
	{
		// GMega LX
		regexp: /^f0 40 0. 10 00 09 04 01 0. 0. 0. f7$/u,
		handler: (self, bytes) => {
			const partNo = bytes[8];
			console.assert(0 <= partNo && partNo < 16);
			const value = ((bytes[9] & 0x0f) << 4) | (bytes[10] & 0x0f);
			if (0 <= value && value < 128) {
				self._parts[partNo].volume = value;
			}
		},
	},
	{
		// SG01
		regexp: /^f0 47 10 42 5d 40 1. 19 .. f7$/u,
		handler: (self, bytes) => {
			const partNo = getPartNo(0, bytes[5], bytes[6]);
			if (0 <= partNo && partNo < 16) {
				self._parts[partNo].volume = bytes[8];
			}
		},
	},

	// System Area (MT-32)
	{
		regexp: /^f0 41 [01]. 16 12 10 00 ..(?: ..){1,23} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const addrL = bytes[7];
			const dataBytes = bytes.slice(8, -1);
			const memBytes = [...new Array(23)].fill(-1);
			memBytes.splice(addrL, dataBytes.length, ...dataBytes);

			if (memBytes[0x03] >= 0) {
				self._system.reverb = memBytes[0x03];
				self._updateDisplayedParameter('reverb');
			}
			for (let i = 0; i < 9; i++) {
				const rxChannelNo = memBytes[0x0d + i];
				if (rxChannelNo >= 0) {
					self._parts[i + 1].rxChannelNo = rxChannelNo;
				}
			}
			if (memBytes[0x16] >= 0) {
				self._system.volume = memBytes[0x16];
				self._updateDisplayedParameter('volume');
			}
		},
	},

	// System (TG100)
	{
		regexp: /^f0 43 1. 27 30 00 0[0-9](?: ..){1,10} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const addrL = bytes[6];
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(10)].fill(-1);
			memBytes.splice(addrL, dataBytes.length, ...dataBytes);

			if (memBytes[0x02] >= 0) {
				self._system.keyShift = memBytes[0x02];
				self._updateDisplayedParameter('keyShift');
			}
			if (memBytes[0x08] >= 0) {
				self._system.volume = memBytes[0x08];
				self._updateDisplayedParameter('volume');
			}
		},
	},
	// Multi Common (TG100)
	{
		regexp: /^f0 43 1. 27 30 00 0[a-f](?: ..){1,6} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const addrL = bytes[6];
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(16)].fill(-1);
			memBytes.splice(addrL, dataBytes.length, ...dataBytes);

			if (memBytes[0x0c] >= 0) {
				self._system.reverb = memBytes[0x0c];
				self._updateDisplayedParameter('reverb');
			}
		},
	},
	// Multi Part (TG100)
	{
		regexp: /^f0 43 1. 27 30 0[0-3] ..(?: ..){1,384} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const [addrM, addrL] = bytes.slice(5, 7);
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(384)].fill(-1);
			memBytes.splice(addrM * 0x80 + addrL - 0x10, dataBytes.length, ...dataBytes);

			for (let i = 0; i < 16; i++) {
				const rxChannelNo = memBytes[i * 24 + 0x02];
				if (rxChannelNo >= 0) {
					self._parts[block2part(i)].rxChannelNo = rxChannelNo;
				}
				const volume = memBytes[i * 24 + 0x07];
				if (volume >= 0) {
					self._parts[block2part(i)].volume = volume;
				}
			}
		},
	},

	// System (TG300)
	{
		regexp: /^f0 43 1. 2b 00 00 0[0-9](?: ..){1,10} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const addrL = bytes[6];
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(10)].fill(-1);
			memBytes.splice(addrL, dataBytes.length, ...dataBytes);

			if (memBytes[0x04] >= 0) {
				self._system.volume = memBytes[0x04];
				self._updateDisplayedParameter('volume');
			}
			if (memBytes[0x05] >= 0) {
				self._system.keyShift = memBytes[0x05];
				self._updateDisplayedParameter('keyShift');
			}
			if (memBytes[0x06] >= 0) {
				self._system.keyShift = memBytes[0x06];
				self._updateDisplayedParameter('pan');
			}
		},
	},
	// Multi Effect (TG300)
	{
		regexp: /^f0 43 1. 2b 01 00 [0-4].(?: ..){1,70} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const addrL = bytes[6];
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(70)].fill(-1);
			memBytes.splice(addrL, dataBytes.length, ...dataBytes);

			if (memBytes[0x09] >= 0) {
				self._system.reverb = memBytes[0x09];
				self._updateDisplayedParameter('reverb');
			}
			if (memBytes[0x0a] >= 0) {
				self._system.chorus = memBytes[0x0a];
				self._updateDisplayedParameter('chorus');
			}
			if (memBytes[0x0b] >= 0) {
				self._system.delayVar = memBytes[0x0b];
				self._updateDisplayedParameter('delayVar');
			}
		},
	},
	// Multi Part (TG300)
	{
		regexp: /^f0 43 1. 2b 02 .. ..(?: ..){1,1552} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}

			const [addrM, addrL] = bytes.slice(5, 7);
			const dataBytes = bytes.slice(7, -2);
			const memBytes = [...new Array(1552)].fill(-1);
			memBytes.splice(addrM * 0x61 + addrL, dataBytes.length, ...dataBytes);

			for (let i = 0; i < 16; i++) {
				const rxChannelNo = memBytes[i * 0x61 + 0x04];
				if (rxChannelNo >= 0) {
					self._parts[block2part(i)].rxChannelNo = rxChannelNo;
				}
				const partMode = memBytes[i * 0x61 + 0x17];
				if (partMode >= 0) {
					self._parts[block2part(i)].isRhythmPart = (partMode !== 0x00);
				}
				const volume = memBytes[i * 0x61 + 0x1b];
				if (volume >= 0) {
					self._parts[block2part(i)].volume = volume;
				}
			}
		},
	},

	// Patch Name
	{
		// GS
		regexp: /^f0 41 [01]. 42 12 40 01 00(?: ..){1,16} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.setPatchName(makeDisplayedLetterStr(bytes.slice(8, -2)));
		},
	},

	// Displayed Letter
	{
		// Sound Canvas
		regexp: /^f0 41 [01]. 45 12 10 00 00(?: ..){1,32} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.displayLetter(makeDisplayedLetterStr(bytes.slice(8, -2)));
		},
	},
	{
		// MU Series
		regexp: /^f0 43 1. 4c 06 00 00(?: ..){1,32} f7$/u,
		handler: (self, bytes) => {
			self.displayLetter(makeDisplayedLetterStr(bytes.slice(7, -1)));
		},
	},
	{
		// MT-32
		regexp: /^f0 41 [01]. 16 12 20 00 00(?: ..){1,20} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self.displayLetter(makeDisplayedLetterStr(bytes.slice(8, -2)));
		},
	},
	{
		// TG300
		regexp: /^f0 43 1. 2b 07 00 00(?: ..){1,32} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForYamaha(self, bytes)) {
				return;
			}
			self.displayLetter(makeDisplayedLetterStr(bytes.slice(7, -2)));
		},
	},
	{
		// NS5R
		regexp: /^f0 42 3. 42 12 08 00 00(?: ..){1,32} f7$/u,
		handler: (self, bytes) => {
			self.displayLetter(makeDisplayedLetterStr(bytes.slice(8, -1)));
		},
	},

	// Displayed Dot Data
	{
		// Sound Canvas
		regexp: /^f0 41 [01]. 45 12 10 0[1-5] [04]0(?: ..){64} .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const [addrM, addrL] = bytes.slice(6, 8);
			const pageNo = (addrM - 1) * 2 + addrL / 64;
			console.assert(Number.isInteger(pageNo));

			if (0 <= pageNo && pageNo < 10) {
				const dataBytes = bytes.slice(8, -2).map((byte) => byte & 0x1f);
				const bits = [...new Array(16)].map((_, i) => (dataBytes[i] << 11) | (dataBytes[i + 16] << 6) | (dataBytes[i + 32] << 1) | (dataBytes[i + 48] >> 4));
				self._lcd.displayedDotDataPages[pageNo] = bits;
				if (pageNo === 0) {
					self.displayDotData(bits);
				}
			}
		},
	},
	{
		// MU Series
		regexp: /^f0 43 1. 4c 07 00 ..(?: ..){1,48} f7$/u,
		handler: makeYamahaDisplayDotDataHandler(),
	},
	{
		// TG300
		regexp: /^f0 43 1. 2b 07 01 ..(?: ..){1,48} .. f7$/u,
		handler: makeYamahaDisplayDotDataHandler(true),
	},

	// Display Type (SC-55mkII)
	{
		regexp: /^f0 41 [01]. 45 12 10 08 00 .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const type = bytes[8];
			if (0 <= type && type < 8) {
				self.displayType = type;
			}
		},
	},

	// Peak Hold Type (SC-55mkII)
	{
		regexp: /^f0 41 [01]. 45 12 10 08 01 .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const type = bytes[8];
			if (0 <= type && type < 4) {
				self.peakHoldType = type;
			}
		},
	},

	// Display Page (SC-88)
	{
		regexp: /^f0 41 [01]. 45 12 10 20 00 .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const value = bytes[8];
			if (value === 0) {
				self._resetDisplayDotData();
			} else if (1 <= value && value < 11) {
				self.displayDotData(self._lcd.displayedDotDataPages[value - 1]);
			}
		},
	},

	// Display Time (SC-88)
	{
		regexp: /^f0 41 [01]. 45 12 10 20 01 .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}

			const time = bytes[8];
			if (0 <= time && time < 16) {
				self._lcd.displayTime = time;
			}
		},
	},

	// Display Reset (MT-32)
	{
		// MT-32
		regexp: /^f0 41 [01]. 16 12 20 01 00 .. .. f7$/u,
		handler: (self, bytes) => {
			if (processCheckSumErrorForRoland(self, bytes)) {
				return;
			}
			self._resetDisplayDotData();
		},
	},

	// LCD Backlight Color (NS5R)
	{
		regexp: /^f0 42 3. 42 7d .. f7$/u,
		handler: (self, bytes) => {
			const color = bytes[5];
			if (0 <= color && color <= 2) {
				self.setColorScheme(['green', 'orange', 'red'][color]);
			}
		},
	},
]);
/* eslint-enable no-underscore-dangle, no-use-before-define */

// CSS definitions
const CLASS_PREFIX = 'sound-canvas-lcd-color';
const cssColorClasses = Object.freeze({
	orange:     'color: black; background-color: hsl(30, 100%, 50%);',
	green:      'color: black; background-color: hsl(75, 100%, 50%);',
	red:        'color: black; background-color: hsl(10, 100%, 50%);',
	darkorange: 'color: hsl(30, 100%, 50%); background-color: hsl(30, 100%, 12.5%);',
	darkgreen:  'color: hsl(75, 100%, 50%); background-color: hsl(75, 100%, 12.5%);',
	darkblue:   'color: hsl(180, 100%, 50%); background-color: hsl(180, 100%, 12.5%);',
});
const cssColorSchemeStr = '<style type="text/css" class="host-css">\n' +
	Object.entries(cssColorClasses).map(([key, value]) => `:host(.${CLASS_PREFIX}-${key}) {${value}}`).join('\n') + '\n' +
	Object.entries(cssColorClasses).reduce((p, [key, value], index, entries) => {
		let keyFrameStr = '';
		for (let i = 0; i < entries.length; i++) {
			if (i !== index) {
				keyFrameStr += `@keyframes ${CLASS_PREFIX}-from-${key}-to-${entries[i][0]} {0% {${value}} 100% {${entries[i][1]}}}\n`;
			}
		}
		return `${p}${keyFrameStr}`;
	}, '') + '</style>';

export class SoundCanvasLcdEx extends SoundCanvasLcd {
	constructor() {
		super();

		this._propertyHandlers = Object.freeze({
			rows:         (attr) => {this.rows         = Number(attr);},
			displaytype:  (attr) => {this.displayType  = Number(attr);},
			peakholdtype: (attr) => {this.peakHoldType = Number(attr);},
		});

		this._settings = {
			displayedParameters: {},
			rowNum: 1,
		};

		this.setDefaultPatchName('- SOUND Canvas -');
		this.setDefaultColor('orange');

		this.reset(SoundCanvasLcdEx.initialParameters.gs);

		this.setDisplayedParameters({
			value1: 'patchName',
			value2: 'volume',
			value3: 'pan',
			value4: 'reverb',
			value5: 'chorus',
//			value6: 'keyShift',
			value6: 'delayVar',
//			value7: 'deviceId',
		});
		this.value0 = 'ALL';
		this.value7 = 'A--';
		this.label7 = 'MIDI CH';
		this.rows = this._settings.rowNum;

		const colorClassNames = Object.keys(cssColorClasses).map((key) => `${CLASS_PREFIX}-${key}`);
		if ([...this.classList.values()].filter((value) => value.startsWith(CLASS_PREFIX)).every((className) => !colorClassNames.includes(className))) {
			this.setColorScheme(this._settings.defaultColor);
		}

		this._shadowRoot.firstChild.insertAdjacentHTML('afterbegin', cssColorSchemeStr);
	}

	static get observedAttributes() {
		return [...super.observedAttributes, 'rows', 'displaytype', 'peakholdtype'];
	}

	attributeChangedCallback(attr, oldVal, newVal) {
		const handler = this._propertyHandlers[attr];
		if (handler) {
			if (newVal !== oldVal) {
				handler(newVal);
			}
		} else {
			super.attributeChangedCallback(attr, oldVal, newVal);
		}
	}

	connectedCallback() {
		// Starts updating.
		this._isActive = true;
		requestAnimationFrame(this._updateLevelBars.bind(this));
	}

	static get initialParameters() {
		return {
			gs: {volume: 127, reverb:  64, chorus:  64, delayVar:  64, deviceId: 0x10},
			xg: {volume: 127, reverb:  64, chorus:  64, delayVar:  64, deviceId: 0x00},
			mt: {volume: 100, reverb:   7, chorus:   0, delayVar:   0, deviceId: 0x10},
		};
	}

	get rows() {
		return this._settings.rowNum;
	}

	set rows(rowNum) {
		if (!Number.isInteger(rowNum) || ![1, 2, 4].includes(rowNum)) {
			console.warn('Invalid value');
			return;
		}

		this._settings.rowNum = rowNum;
		this._bars = [...new Array(64)].map(() => ({
			currentLevel: 0,
			currentPeakLevel: 0,
			peakLevel: 0,
			timestampPeak: 0,
		}));
		this._isActive = true;

		this.setAttribute('rows', rowNum);
	}

	get displayType() {
		return this._lcd.displayType;
	}

	set displayType(type) {
		if (!Number.isInteger(type) || (type < 0 || 8 <= type)) {
			console.warn('Invalid value');
			return;
		}

		this._lcd.displayType = type;
		this._isActive = true;

		this.setAttribute('displaytype', type);
	}

	get peakHoldType() {
		return this._lcd.peakHoldType;
	}

	set peakHoldType(type) {
		if (!Number.isInteger(type) || (type < 0 || 4 <= type)) {
			console.warn('Invalid value');
			return;
		}

		this._lcd.peakHoldType = type;
		this._isActive = true;

		this.setAttribute('peakholdtype', type);
	}

	get parts() {
		return this._parts;
	}

	reset(initialParameters = {}) {
		this._parts = [...new Array(64)].map((_, partNo) => ({
			rxPortNo: Math.trunc(partNo / 16),
			rxChannelNo: partNo % 16,
			volume: 100,
			expression: 127,
			isRhythmPart: (partNo % 16 === 9),
			notes: [...new Array(128)].map(() => ({
				isUsed: false,
				isNoteOn: false,
				timestampOn: 0,
				timestampOff: 0,
			})),
		}));
		this._lcd = {
			displayType: 0x00,
			peakHoldType: 0x01,
			displayTime: 0x06,
			displayedLetter: null,
			letterTimerId: -1,
			currentLetterIndex: -1,
			displayedDotDataPages: [...new Array(10)].map(() => [...new Array(16)].fill(0)),
			dotDataTimerId: -1,
		};
		this._system = {
			volume:   ('volume'   in initialParameters) ? initialParameters.volume   : 127,
			reverb:   ('reverb'   in initialParameters) ? initialParameters.reverb   :  64,
			chorus:   ('chorus'   in initialParameters) ? initialParameters.chorus   :  64,
			delayVar: ('delayVar' in initialParameters) ? initialParameters.delayVar :   0,
			pan: 64,
			keyShift: 64,
			deviceId: ('deviceId' in initialParameters) ? initialParameters.deviceId : 0x00,
			patchName: this._settings.defaultPatchName,
		};

		for (const paramName of Object.values(this._settings.displayedParameters)) {
			this._updateDisplayedParameter(paramName);
		}
	}

	setDisplayedParameters(params) {
		const labels = {
			volume:   'LEVEL',
			reverb:   'REVERB',
			chorus:   'CHORUS',
			delayVar: 'DELAY/VAR',
			pan:      'PAN',
			keyShift: 'K SHIFT',
			deviceId: 'MIDI CH',
		};

		const sanitizedParams = Object.fromEntries(Object.entries(params).filter(([key, value]) => (/^value[0-7]$/u.test(key) && value in this._system)));
		this._settings.displayedParameters = {...this._settings.displayedParameters, ...sanitizedParams};

		for (const [key, value] of Object.entries(sanitizedParams)) {
			if (value in labels) {
				this[key.replace('value', 'label')] = labels[value];
			}
			this._updateDisplayedParameter(value);
		}
	}

	_updateDisplayedParameter(paramName) {
		const formatters = {
			patchName: (value) => value,
			volume:    (value) => value,
			reverb:    (value) => value,
			chorus:    (value) => value,
			delayVar:  (value) => value,
			pan:       (value) => String(value - 64).replace(/^-/u, 'L').replace(/^\+/u, 'R'),
			keyShift:  (value) => {
				const v = Number(value) - 64;
				return `${'-±+'[Math.sign(v) + 1]}${String(Math.abs(v)).padStart(2, ' ')}`;
			},
			deviceId:  (value) => (value < 0x20) ? value + 1 : value,
		};

		const keys = Object.entries(this._settings.displayedParameters).filter(([_, value]) => (value === paramName)).map(([key, _]) => key);
		for (const key of keys) {
			console.assert(/^value[0-7]$/u.test(key));
			console.assert(paramName in this._system);
			this[key] = formatters[paramName](this._system[paramName]);
		}
	}

	setDefaultPatchName(name) {
		if (typeof name !== 'string') {
			console.warn('Invalid value');
			return;
		}

		this._settings.defaultPatchName = name.padEnd(16, ' ').slice(0, 16);
	}

	setPatchName(name) {
		if (typeof name !== 'string') {
			console.warn('Invalid value');
			return;
		}

		this._system.patchName = `${name.slice(0, 16)}${this._system.patchName.slice(name.length, 16)}`;
		if (!this._isLetterDisplayed()) {
			this._updateDisplayedParameter('patchName');
		}
	}

	displayLetter(str) {
		if (typeof name !== 'string') {
			console.warn('Invalid value');
			return;
		}

		this._resetDisplayLetter();
		this._lcd.displayedLetter = (str.length <= 16) ? str : str.slice(0, 32);
		this._lcd.currentLetterIndex = 0;
		this._isActive = true;

		this._handleLetterTimer();
	}

	displayDotData(bits) {
		if (!Array.isArray(bits) || bits.length !== 16 || !bits.every((bit) => Number.isInteger(bit))) {
			console.warn('Invalid value');
			return;
		}

		this.bitmap = bits.map((bit) => bit.toString(16).padStart(4, '0')).join('');

		this._resetDisplayDotData();
		this._lcd.dotDataTimerId = setTimeout(() => {
			this._lcd.dotDataTimerId = -1;
			this._isActive = true;
		}, 480 * this._lcd.displayTime);
	}

	_resetDisplayLetter() {
		if (this._isLetterDisplayed()) {
			clearTimeout(this._lcd.letterTimerId);
			this._lcd.letterTimerId = -1;
		}
		this._lcd.currentLetterIndex = -1;
		this.value1 = this._system.patchName;
	}

	_resetDisplayDotData() {
		if (this._isDotDataDisplayed()) {
			clearTimeout(this._lcd.dotDataTimerId);
			this._lcd.dotDataTimerId = -1;
		}
		this._isActive = true;
	}

	_handleLetterTimer() {
		const index = this._lcd.currentLetterIndex;
		if (index < 0) {
			this._resetDisplayLetter();
			return;
		}

		if (this._lcd.displayedLetter.length <= 16) {
			this._lcd.currentLetterIndex = -1;
			this.value1 = `${' '.repeat(Math.trunc((17 - this._lcd.displayedLetter.length) / 2))}${this._lcd.displayedLetter}`;	// Centering

			this._lcd.letterTimerId = setTimeout(() => this._handleLetterTimer(), 2880);

		} else {
			const str = `${this._system.patchName}<${this._lcd.displayedLetter}<${this._system.patchName}`;
			console.assert(str.length === this._lcd.displayedLetter.length + (16 + 1) * 2);
			this.value1 = str.slice(index, index + 16);
			if (index <= this._lcd.displayedLetter.length + 16) {
				this._lcd.currentLetterIndex++;
			} else {
				this._lcd.currentLetterIndex = -1;
			}

			this._lcd.letterTimerId = setTimeout(() => this._handleLetterTimer(), 300);
		}
	}

	_isLetterDisplayed() {
		return (this._lcd.letterTimerId >= 0);
	}

	_isDotDataDisplayed() {
		return (this._lcd.dotDataTimerId >= 0);
	}

	setDefaultColor(color) {
		if (!cssColorClasses[color]) {
			console.warn('Invalid value');
			return;
		}

		this._settings.defaultColor = color;
	}

	setColorScheme(color) {
		if (!cssColorClasses[color]) {
			console.warn('Invalid value');
			return;
		}

		// Removes and adds classes.
		const colorClasses = [...this.classList.values()].filter((value) => value.startsWith(CLASS_PREFIX));
		this.classList.remove(...colorClasses);
		this.classList.add(`${CLASS_PREFIX}-${color}`);

		// Sets CSS animation.
		if (colorClasses.length === 1) {
			const oldColor = colorClasses[0].replace(`${CLASS_PREFIX}-`, '');
			if (color !== oldColor) {
				this.style.animation = `sound-canvas-lcd-color-from-${oldColor}-to-${color} 0.5s ease-out both`;
			}
		}
	}

	inputBytes(bytes, portNo = 0) {
		if (!bytes || !bytes.length || !Number.isInteger(portNo) || portNo < 0) {
			console.warn('Invalid value');
			return;
		}

		const timestamp = performance.now();
		const statusByte = bytes[0];
		switch (statusByte >> 4) {
		case 0x8:	// Note Off
		case 0x9:	// Note On
			this._handleNoteOnOff(timestamp, bytes, portNo);
			break;

		case 0xb:	// Control Change
			this._handleControlChange(timestamp, bytes, portNo);
			break;

		case 0xf:	// SysEx
			if (statusByte === 0xf0) {
				this._handleSysEx(timestamp, bytes, portNo);
			}
			break;

		default:
			break;
		}
	}

	_handleNoteOnOff(timestamp, bytes, portNo) {
		console.assert(bytes && bytes.length);
		if (bytes.length !== 3) {
			return;
		}

		const channelNo = bytes[0] & 0x0f;
		for (let i = 0; i < this._parts.length; i++) {
			const partNo = portNo * 16 + i;
			const part = this._parts[partNo];
			if (part.rxPortNo !== portNo || part.rxChannelNo !== channelNo) {
				continue;
			}

			const [statusByte, noteNo, velocity] = bytes;
			const isNoteOn = ((statusByte & 0xf0) === 0x90) && (velocity > 0);

			const note = part.notes[noteNo];
			note.isUsed = true;
			note.isNoteOn = isNoteOn;
			if (isNoteOn) {
				note.timestampOn = timestamp;
				note.velocity = velocity;
			} else {
				note.timestampOff = timestamp;
			}
		}

		this._isActive = true;
	}

	_handleControlChange(timestamp, bytes, portNo) {
		console.assert(bytes && bytes.length);
		if (bytes.length !== 3) {
			return;
		}

		const channelNo = bytes[0] & 0x0f;
		for (let i = 0; i < this._parts.length; i++) {
			const partNo = portNo * 16 + i;
			const part = this._parts[partNo];
			if (part.rxPortNo !== portNo || part.rxChannelNo !== channelNo) {
				continue;
			}

			const [_, ccNo, value] = bytes;
			switch (ccNo) {
			case 7:
				part.volume = value;
				break;

			case 11:
				part.expression = value;
				break;

			case 121:
				part.expression = 127;
				break;

			case 120:
			case 123:
			case 124:
			case 125:
			case 126:
			case 127:
				part.notes.filter((note) => note.isUsed).forEach((note) => {
					note.isNoteOn = false;
					note.timestampOff = timestamp;
				});
				break;

			default:
				break;
			}
		}
	}

	_handleSysEx(_, bytes, portNo) {
		console.assert(bytes && bytes.length);

		const hexStr = [...bytes].map((byte) => `0${Number(byte).toString(16)}`.slice(-2)).join(' ');
		for (const parser of parsers) {
			if (parser.regexp.test(hexStr)) {
				parser.handler(this, bytes, portNo);
				return;
			}
		}
	}

	_updateLevelBars(timestamp) {
		if (this._isActive) {
			// Calculates each part's volume.
			const masterVolume = this._system.volume;
			const volumes = this._parts.map((part) => {
				let totalVolume = 0.0;
				const getEnvelopeLevel = (part.isRhythmPart) ? getDrumEnvelopeLevel : getToneEnvelopeLevel;
				part.notes.filter((note) => note.isUsed).forEach((note) => {
					const velocity = note.velocity || 0;
					const volume = getEnvelopeLevel(Math.max(timestamp, note.timestampOn), note.timestampOn, (note.isNoteOn) ? 0 : Math.min(timestamp, note.timestampOff)) * velocity * part.expression * part.volume * masterVolume / (127 * 127 * 127 * 127);
					console.assert(Number.isFinite(volume));
					totalVolume += Math.max(volume, 0);
					if (volume <= 0.0) {
						note.isUsed = false;
					}
				});
				console.assert(totalVolume >= 0.0);
				return totalVolume;
			});

			// Converts from each part's volume to level. (= number of cells)
			const cellNum = 16 / this._settings.rowNum;
			console.assert(Number.isInteger(cellNum));
			const currentLevels = volumes.map((volume) => Math.min(Math.trunc(Math.cbrt(volume) * 8 / this._settings.rowNum), cellNum - 1));

			// Gets each part's current peak level.
			const getPeakHoldLevel = getPeakHoldLevelFuncs[this._lcd.peakHoldType];
			this._bars.forEach((bar, partNo) => {
				bar.currentLevel = currentLevels[partNo];
				console.assert(bar.currentLevel < cellNum);
				if (bar.currentLevel >= bar.peakLevel) {
					bar.peakLevel = bar.currentLevel;
					bar.timestampPeak = timestamp;
				}

				bar.currentPeakLevel = getPeakHoldLevel(timestamp - bar.timestampPeak, bar.peakLevel);
				if (bar.currentLevel > bar.currentPeakLevel) {
					bar.peakLevel = bar.currentLevel;
					bar.currentPeakLevel = bar.currentLevel;
				}
			});

			// Displays level indicator.
			if (!this._isDotDataDisplayed()) {
				this.vbitmap = this._makeBarBitmap();
			}

			// Checks whether the bar indicator have to be updated or not.
			if (volumes.every((volume) => (volume <= 0.0)) && this._bars.every((bar) => (bar.currentPeakLevel === 0))) {
				this._isActive = false;
			}
		}

		requestAnimationFrame(this._updateLevelBars.bind(this));
	}

	_makeBarBitmap() {
		const rowNum = this._settings.rowNum;
		const colNum = 16 / rowNum;
		const totalMaskBit = (1 << colNum) - 1;

		const levelMaskBit = ((this._lcd.displayType & 0x1) === 0) ? totalMaskBit : 0x0000;
		const totalXorBit  = ((this._lcd.displayType & 0x4) === 0) ? 0x0000 : totalMaskBit;

		const getDisplayPeakLevel = (this._lcd.peakHoldType !== 3) ? (bar) => bar.currentPeakLevel : (bar) => {
			const displayPeakLevel = (bar.currentPeakLevel > 0) ? bar.peakLevel + (bar.peakLevel - bar.currentPeakLevel) : 0;
			return (0 <= displayPeakLevel && displayPeakLevel < colNum) ? displayPeakLevel : 0;
		};
		const reverseBar = ((this._lcd.displayType & 0x2) === 0) ? (bit) => bit : (bit) => reverseBits(bit, colNum);

		const bits = this._bars.slice(0, 16 * rowNum).map((bar) => {
			const levelBit = (1 << (bar.currentLevel + 1)) - 1;
			const peakBit  = (1 << getDisplayPeakLevel(bar));
			const compositeBit = (((levelBit & levelMaskBit) | peakBit | 0x0001) & totalMaskBit) ^ totalXorBit;
			return reverseBar(compositeBit);
		});

		const bitmapStr = bits.map((bit) => bit.toString(16).padStart(colNum / 4, '0')).join('');

		return rearrangeBitmapStrFuncs[rowNum](bitmapStr);
	}
}

customElements.define('sound-canvas-lcd-ex', SoundCanvasLcdEx);
