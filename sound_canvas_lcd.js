// Constants about metrics
const LCD_WIDTH  = 1280;
const LCD_HEIGHT =  480;
const LCD_PADDING_X = 60;
const LCD_PADDING_Y = 40;
const LCD_GAP = 40;

const FONT_WIDTH  = 50;
const FONT_HEIGHT = 70;
const FONT_GAP_X = 10;

const LABEL_FONT_SIZE = 28;
const LABEL_FONT_STRETCH = 1.2;

const BARS_WIDTH  = FONT_WIDTH * 12 + FONT_GAP_X * 11;
const BARS_HEIGHT = FONT_HEIGHT * 3 + LCD_GAP * 2;
const BARS_BASE_X = LCD_PADDING_X + (FONT_WIDTH * 3 + FONT_GAP_X * 2) + LCD_GAP + (FONT_WIDTH + FONT_GAP_X) * 4;
const BARS_BASE_Y = LCD_PADDING_Y + FONT_HEIGHT + LCD_GAP;

console.assert(LCD_WIDTH === LCD_PADDING_X + (FONT_WIDTH + FONT_GAP_X) * 3 - FONT_GAP_X + LCD_GAP + (FONT_WIDTH + FONT_GAP_X) * 16 - FONT_GAP_X + LCD_PADDING_X);
console.assert(LCD_HEIGHT === LCD_PADDING_Y + FONT_HEIGHT * 4 + LCD_GAP * 3 + LCD_PADDING_Y);

// 5x7 font bitmap data
const fontBits = {
	' ':      [0b0000000, 0b0000000, 0b0000000, 0b0000000, 0b0000000],
	'!':      [0b0000000, 0b0000000, 0b1011111, 0b0000000, 0b0000000],
	'"':      [0b0000000, 0b0000111, 0b0000000, 0b0000111, 0b0000000],
	'#':      [0b0010100, 0b1111111, 0b0010100, 0b1111111, 0b0010100],
	'$':      [0b0100100, 0b0101010, 0b1111111, 0b0101010, 0b0010010],
	'%':      [0b0100011, 0b0010011, 0b0001000, 0b1100100, 0b1100010],
	'&':      [0b0110110, 0b1001001, 0b1010101, 0b0100010, 0b1010000],
	'\'':     [0b0000000, 0b0000101, 0b0000011, 0b0000000, 0b0000000],
	'(':      [0b0000000, 0b0011100, 0b0100010, 0b1000001, 0b0000000],
	')':      [0b0000000, 0b1000001, 0b0100010, 0b0011100, 0b0000000],
	'*':      [0b0010100, 0b0001000, 0b0111110, 0b0001000, 0b0010100],
	'+':      [0b0001000, 0b0001000, 0b0111110, 0b0001000, 0b0001000],
	',':      [0b0000000, 0b1010000, 0b0110000, 0b0000000, 0b0000000],
	'-':      [0b0001000, 0b0001000, 0b0001000, 0b0001000, 0b0001000],
	'.':      [0b0000000, 0b1100000, 0b1100000, 0b0000000, 0b0000000],
	'/':      [0b0100000, 0b0010000, 0b0001000, 0b0000100, 0b0000010],
	'0':      [0b0111110, 0b1010001, 0b1001001, 0b1000101, 0b0111110],
	'1':      [0b0000000, 0b1000010, 0b1111111, 0b1000000, 0b0000000],
	'2':      [0b1000010, 0b1100001, 0b1010001, 0b1001001, 0b1000110],
	'3':      [0b0100001, 0b1000001, 0b1000101, 0b1001011, 0b0110001],
	'4':      [0b0011000, 0b0010100, 0b0010010, 0b1111111, 0b0010000],
	'5':      [0b0100111, 0b1000101, 0b1000101, 0b1000101, 0b0111001],
	'6':      [0b0111100, 0b1001010, 0b1001001, 0b1001001, 0b0110000],
	'7':      [0b0000001, 0b1110001, 0b0001001, 0b0000101, 0b0000011],
	'8':      [0b0110110, 0b1001001, 0b1001001, 0b1001001, 0b0110110],
	'9':      [0b0000110, 0b1001001, 0b1001001, 0b0101001, 0b0011110],
	':':      [0b0000000, 0b0110110, 0b0110110, 0b0000000, 0b0000000],
	';':      [0b0000000, 0b1010110, 0b0110110, 0b0000000, 0b0000000],
	'<':      [0b0000000, 0b0001000, 0b0010100, 0b0100010, 0b1000001],
	'=':      [0b0010100, 0b0010100, 0b0010100, 0b0010100, 0b0010100],
	'>':      [0b1000001, 0b0100010, 0b0010100, 0b0001000, 0b0000000],
	'?':      [0b0000010, 0b0000001, 0b1010001, 0b0001001, 0b0000110],
	'@':      [0b0110010, 0b1001001, 0b1111001, 0b1000001, 0b0111110],
	'A':      [0b1111110, 0b0010001, 0b0010001, 0b0010001, 0b1111110],
	'B':      [0b1111111, 0b1001001, 0b1001001, 0b1001001, 0b0110110],
	'C':      [0b0111110, 0b1000001, 0b1000001, 0b1000001, 0b0100010],
	'D':      [0b1111111, 0b1000001, 0b1000001, 0b0100010, 0b0011100],
	'E':      [0b1111111, 0b1001001, 0b1001001, 0b1001001, 0b1000001],
	'F':      [0b1111111, 0b0001001, 0b0001001, 0b0001001, 0b0000001],
	'G':      [0b0111110, 0b1000001, 0b1001001, 0b1001001, 0b1111010],
	'H':      [0b1111111, 0b0001000, 0b0001000, 0b0001000, 0b1111111],
	'I':      [0b0000000, 0b1000001, 0b1111111, 0b1000001, 0b0000000],
	'J':      [0b0100000, 0b1000000, 0b1000001, 0b0111111, 0b0000001],
	'K':      [0b1111111, 0b0001000, 0b0010100, 0b0100010, 0b1000001],
	'L':      [0b1111111, 0b1000000, 0b1000000, 0b1000000, 0b1000000],
	'M':      [0b1111111, 0b0000010, 0b0001100, 0b0000010, 0b1111111],
	'N':      [0b1111111, 0b0000100, 0b0001000, 0b0010000, 0b1111111],
	'O':      [0b0111110, 0b1000001, 0b1000001, 0b1000001, 0b0111110],
	'P':      [0b1111111, 0b0001001, 0b0001001, 0b0001001, 0b0000110],
	'Q':      [0b0111110, 0b1000001, 0b1010001, 0b0100001, 0b1011110],
	'R':      [0b1111111, 0b0001001, 0b0011001, 0b0101001, 0b1000110],
	'S':      [0b1000110, 0b1001001, 0b1001001, 0b1001001, 0b0110001],
	'T':      [0b0000001, 0b0000001, 0b1111111, 0b0000001, 0b0000001],
	'U':      [0b0111111, 0b1000000, 0b1000000, 0b1000000, 0b0111111],
	'V':      [0b0011111, 0b0100000, 0b1000000, 0b0100000, 0b0011111],
	'W':      [0b0111111, 0b1000000, 0b0111000, 0b1000000, 0b0111111],
	'X':      [0b1100011, 0b0010100, 0b0001000, 0b0010100, 0b1100011],
	'Y':      [0b0000011, 0b0000100, 0b1111000, 0b0000100, 0b0000011],
	'Z':      [0b1100001, 0b1010001, 0b1001001, 0b1000101, 0b1000011],
	'[':      [0b0000000, 0b0000000, 0b1111111, 0b1000001, 0b1000001],
	'\\':     [0b0000010, 0b0000100, 0b0001000, 0b0010000, 0b0100000],
	']':      [0b1000001, 0b1000001, 0b1111111, 0b0000000, 0b0000000],
	'^':      [0b0000100, 0b0000010, 0b0000001, 0b0000010, 0b0000100],
	'_':      [0b1000000, 0b1000000, 0b1000000, 0b1000000, 0b1000000],
	'`':      [0b0000000, 0b0000001, 0b0000010, 0b0000100, 0b0000000],
	'a':      [0b0100000, 0b1010100, 0b1010100, 0b1010100, 0b1111000],
	'b':      [0b1111111, 0b1001000, 0b1000100, 0b1000100, 0b0111000],
	'c':      [0b0111000, 0b1000100, 0b1000100, 0b1000100, 0b0100000],
	'd':      [0b0111000, 0b1000100, 0b1000100, 0b1001000, 0b1111111],
	'e':      [0b0111000, 0b1010100, 0b1010100, 0b1010100, 0b0011000],
	'f':      [0b0001000, 0b1111110, 0b0001001, 0b0000001, 0b0000010],
	'g':      [0b0001100, 0b1010010, 0b1010010, 0b1010010, 0b0111110],
	'h':      [0b1111111, 0b0001000, 0b0000100, 0b0000100, 0b1111000],
	'i':      [0b0000000, 0b1000100, 0b1111101, 0b1000000, 0b0000000],
	'j':      [0b0100000, 0b1000000, 0b1000100, 0b0111101, 0b0000000],
	'k':      [0b1111111, 0b0010000, 0b0101000, 0b1000100, 0b0000000],
	'l':      [0b0000000, 0b1000001, 0b1111111, 0b1000000, 0b0000000],
	'm':      [0b1111100, 0b0000100, 0b0011000, 0b0000100, 0b1111000],
	'n':      [0b1111100, 0b0001000, 0b0000100, 0b0000100, 0b1111000],
	'o':      [0b0111000, 0b1000100, 0b1000100, 0b1000100, 0b0111000],
	'p':      [0b1111100, 0b0010100, 0b0010100, 0b0010100, 0b0001000],
	'q':      [0b0001000, 0b0010100, 0b0010100, 0b0011000, 0b1111100],
	'r':      [0b1111100, 0b0001000, 0b0000100, 0b0000100, 0b0001000],
	's':      [0b1001000, 0b1010100, 0b1010100, 0b1010100, 0b0100000],
	't':      [0b0000100, 0b0111111, 0b1000100, 0b1000000, 0b0100000],
	'u':      [0b0111100, 0b1000000, 0b1000000, 0b0100000, 0b1111100],
	'v':      [0b0011100, 0b0100000, 0b1000000, 0b0100000, 0b0011100],
	'w':      [0b0111100, 0b1000000, 0b0110000, 0b1000000, 0b0111100],
	'x':      [0b1000100, 0b0101000, 0b0010000, 0b0101000, 0b1000100],
	'y':      [0b0001100, 0b1010000, 0b1010000, 0b1010000, 0b0111100],
	'z':      [0b1000100, 0b1100100, 0b1010100, 0b1001100, 0b1000100],
	'{':      [0b0000000, 0b0001000, 0b0110110, 0b1000001, 0b0000000],
	'|':      [0b0000000, 0b0000000, 0b1111111, 0b0000000, 0b0000000],
	'}':      [0b0000000, 0b1000001, 0b0110110, 0b0001000, 0b0000000],
	'~':      [0b0010000, 0b0001000, 0b0001000, 0b0010000, 0b0001000],
	'\u00a5': [0b0010101, 0b0010110, 0b1111100, 0b0010110, 0b0010101],	// YEN SIGN
	'\u00b1': [0b1000100, 0b1000100, 0b1011111, 0b1000100, 0b1000100],	// PLUS-MINUS SIGN
	'\u2161': [0b1000001, 0b1111111, 0b1000001, 0b1111111, 0b1000001],	// ROMAN NUMERAL TWO
};

// Makes SVG symbol strings from the font bitmaps.
const fontSymbols = Object.keys(fontBits).map((key) => {
	const WIDTH = 85;
	const INTERVAL = 100;

	// Makes a symbol string.
	const svg = fontBits[key].reduce((str, bits, x) => {
		let newStr = '';
		for (let y = 0; y < 7; y++) {
			newStr += `<rect class="${((bits & (1 << y)) !== 0) ? 'lcd-on' : 'lcd-off'}" x="${INTERVAL * x}" y="${INTERVAL * y}" width="${WIDTH}" height="${WIDTH}" />`;
		}
		return str + newStr;
	}, `<symbol id="font-${key.codePointAt(0)}" viewBox="0 0 ${INTERVAL * 5} ${INTERVAL * 7}">`) + '</symbol>';

	return svg;
}, {});

// Makes an SVG string of the letters and their labels.
const letterAndLabels = [...new Array(8)].map((_, i) => {
	const letterNum = (i !== 1) ? 3 : 16;		// "1" is for "INSTRUMENT"
	const baseX = LCD_PADDING_X + (FONT_WIDTH * 3 + FONT_GAP_X * 2 + LCD_GAP) * (i % 2);
	const baseY = LCD_PADDING_Y + (FONT_HEIGHT + LCD_GAP) * Math.trunc(i / 2);

	let svg = `<text id="label-${i}" class="label" x="${baseX}" y="${baseY - LABEL_FONT_SIZE * 0.25}" width="${FONT_WIDTH * letterNum}" height="${LABEL_FONT_SIZE}" font-size="${LABEL_FONT_SIZE}" transform="scale(${LABEL_FONT_STRETCH}, 1)" transform-origin="${baseX}">LABEL ${i + 1}</text>`;
	for (let j = 0; j < letterNum; j++) {
		const x = baseX + (FONT_WIDTH + FONT_GAP_X) * j;
		svg += `<use id="letter-${i}-${j}" class="letter" xlink:href="#font-32" x="${x}" y="${baseY}" width="${FONT_WIDTH}" height="${FONT_HEIGHT}"></use>`;
	}

	return svg;
});

// Makes an SVG string of the 16x16 dot matrix.
const barRects = [...new Array(16 * 16)].map((_, i) => {
	const RATIO = BARS_HEIGHT / BARS_WIDTH;
	const INTERVAL = BARS_WIDTH / 16;
	const GAP = INTERVAL * 0.05;

	const x = BARS_BASE_X + INTERVAL * (i % 16);
	const y = BARS_BASE_Y + INTERVAL * Math.trunc(i / 16) * RATIO;

	return `<rect id="dot-${i}" class="lcd-off" x="${x}" y="${y}" width="${INTERVAL - GAP}" height="${INTERVAL * RATIO - GAP}" />`;
});

// Makes an SVG string of the part numbers.
const partNumbers = [...new Array(16)].map((_, i) => {
	const INTERVAL = BARS_WIDTH / 16;
	const WIDTH = INTERVAL * 0.95;

	const x = BARS_BASE_X + INTERVAL * (i % 16) + WIDTH / 2;

	return `<text class="part" x="${x}" y="${BARS_BASE_Y + BARS_HEIGHT + LABEL_FONT_SIZE * 0.75}" width="${WIDTH}" height="${LABEL_FONT_SIZE}" font-size="${LABEL_FONT_SIZE}" text-anchor="middle" transform="scale(${LABEL_FONT_STRETCH}, 1)" transform-origin="${x}">${i + 1}</text>`;
});

// Makes an SVG string of the indicators.
const indicators = [...new Array(11)].map((_, i) => {
	const HEIGHT = BARS_HEIGHT * 15 / 16;
	const INTERVAL = HEIGHT / (11 - 1);

	const cy = BARS_BASE_Y + (BARS_HEIGHT / 16) / 2;

	return `<circle cx="${BARS_BASE_X - 10}" cy="${cy + INTERVAL * i}" r="${(i % 5 === 0) ? 5 : 3}" />`;
});

// Makes an SVG as a template. ('it doesn't mean "<template /> element")
const elemSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
elemSvg.setAttribute('viewBox', `0 0 ${LCD_WIDTH} ${LCD_HEIGHT}`);
elemSvg.innerHTML = `
<style type="text/css">
:host {
	display: block;
	box-shadow: 0 0 10vw 0 rgba(0, 0, 0, 0.5) inset;
	border-style: inset;
	border-width: 0;
	line-height: 0;
	font-family: 'Arial';
}

.lcd-on {
	opacity: 0.75;
}
.lcd-off {
	opacity: 0.125;
}

.label, .part {
	opacity: 0.875;
}
.part {
	letter-spacing: -0.1em;
}
</style>

${fontSymbols.join('\n')}
<g fill="currentColor">
	${letterAndLabels.join('')}
</g>
<g fill="currentColor">
	${barRects.join('')}
</g>
<g fill="currentColor">
	${partNumbers.join('')}
</g>
<g fill="currentColor">
	${indicators.join('')}
</g>
<g fill="currentColor">
	<text class="lcd-off" x="${BARS_BASE_X - FONT_WIDTH + 5}" y="${BARS_BASE_Y + LABEL_FONT_SIZE * 0.75}" width="${LABEL_FONT_SIZE}" height="${LABEL_FONT_SIZE}" font-size="${LABEL_FONT_SIZE}" transform="scale(${LABEL_FONT_STRETCH}, 1)" transform-origin="${BARS_BASE_X - 45}">L</text>
	<text class="lcd-off" x="${BARS_BASE_X - FONT_WIDTH + 5}" y="${BARS_BASE_Y + BARS_HEIGHT}" width="${LABEL_FONT_SIZE}" height="${LABEL_FONT_SIZE}" font-size="${LABEL_FONT_SIZE}" transform="scale(${LABEL_FONT_STRETCH}, 1)" transform-origin="${BARS_BASE_X - 45}">R</text>
</g>`;

const defaultProps = {
	label0: '',			// 'PART'
	label1: '',			// 'INSTRUMENT'
	label2: 'LEVEL',
	label3: 'PAN',
	label4: 'REVERB',
	label5: 'CHORUS',
	label6: 'K SHIFT',
	label7: 'MIDI CH',
	value0: '',
	value1: '',
	value2: '',
	value3: '',
	value4: '',
	value5: '',
	value6: '',
	value7: '',
	bitmap: '0000'.repeat(16),
};

const hasGlyph = (() => {
	const chars = Object.keys(fontBits);
	return (ch) => chars.includes(ch);
})();

export class SoundCanvasLcd extends HTMLElement {
	constructor() {
		super();

		// Initializes the member arguments.
		this._elemSvg = elemSvg.cloneNode(true);
		this._dirtyFlags = new Set();

		// Defines the properties.
		for (let i = 0; i < 8; i++) {
			// Labels
			const label = `label${i}`;
			Object.defineProperty(this, label, {
				get() {
					return this.getAttribute(label);
				},
				set(val) {
					if (typeof val !== 'string') {
						console.warn('Invalid value');
						return;
					}
					this.setAttribute(label, val);
					this._setDirtyFlag(label);
				},
			});

			// Values
			const value = `value${i}`;
			Object.defineProperty(this, value, {
				get() {
					return this.getAttribute(value);
				},
				set(val) {
					if (typeof val !== 'string' && typeof val !== 'number') {
						console.warn('Invalid value');
						return;
					}
					this.setAttribute(value, val);
					this._setDirtyFlag(value);
				},
			});
		}

		// Sets dirty flags for all the parts to force initial drawing.
		for (const key of Object.keys(defaultProps)) {
			this._setDirtyFlag(key);
		}

		// Creates and attaches the shadow root.
		this._shadowRoot = this.attachShadow({mode: 'open'});
		this._shadowRoot.appendChild(this._elemSvg);
	}

	connectedCallback() {
		// Sets all the attributes to initialize.
		for (const attr of [...this.attributes]) {
			this[attr] = this.attributes[attr];
		}
	}

	attributeChangedCallback(attr, oldVal, newVal) {
		// Update the attribute if necessary.
		if (oldVal !== newVal) {
			this[attr] = newVal;
		}
	}

	static get observedAttributes() {
		return Object.keys(defaultProps);
	}

	get bitmap() {
		return this.getAttribute('bitmap');
	}

	set bitmap(val) {
		if (!/^[0-9a-f]{64}$/uig.test(val)) {
			console.warn('Invalid value');
			return;
		}
		this.setAttribute('bitmap',  val);
		this._setDirtyFlag('bitmap');
	}

	_setDirtyFlag(key) {
		// If it is the first time of setting dirty flag, requests the update at the next repaint.
		if (this._dirtyFlags.size === 0) {
			requestAnimationFrame(this._updateLcd.bind(this));
		}
		this._dirtyFlags.add(key);
	}

	_updateLcd() {
		console.assert(this._dirtyFlags.size > 0, '_updateLcd is called although the dirty flags have not been set.');

		// Updates each part.
		this._dirtyFlags.forEach((key) => {
			const m = key.match(/^([a-zA-Z]+)(\d+)$/u);
			const attr = this.getAttribute(key);
			if (key.startsWith('value')) {
				const index = m[2];
				const str = (index !== '1') ? `   ${attr}`.slice(-3) : `${attr}                `.slice(0, 16);
				str.split('').forEach((ch, i) => {
					const elem = this._elemSvg.getElementById(`letter-${index}-${i}`);
					const code = ((hasGlyph(ch)) ? ch : '?').charCodeAt(0);
					elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#font-${code}`);
				});

			} else if (key.startsWith('label')) {
				const index = m[2];
				const elem = this._elemSvg.getElementById(`label-${index}`);
				elem.textContent = attr;

			} else if (key === 'bitmap') {
				const bits = attr.match(/[0-9a-f]{4}/uig).map((hex) => parseInt(hex, 16));
				for (let y = 0; y < 16; y++) {
					const bit = bits[y];
					for (let x = 0; x < 16; x++) {
						const elem = this._elemSvg.getElementById(`dot-${x + 16 * y}`);
						if ((bit & (1 << (15 - x))) !== 0) {
							elem.classList.remove('lcd-off');
							elem.classList.add('lcd-on');
						} else {
							elem.classList.remove('lcd-on');
							elem.classList.add('lcd-off');
						}
					}
				}

			} else {
				console.assert(false);
			}
		});

		this._dirtyFlags.clear();
	}
}

customElements.define('sound-canvas-lcd', SoundCanvasLcd);
