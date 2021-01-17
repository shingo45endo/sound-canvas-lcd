sound-canvas-lcd
================

[![](https://user-images.githubusercontent.com/24827672/59031877-dff40680-889f-11e9-9947-f0d5406ca3de.png)](https://shingo45endo.github.io/sound-canvas-lcd/)

This is a Web Component to display LCD panel like Roland SOUND Canvas.


Usage
-----

### sound-canvas-lcd ([Demo](https://shingo45endo.github.io/sound-canvas-lcd/))

	<script type="module" src="./sound_canvas_lcd.js"></script>
	
	<sound-canvas-lcd style="color: black; background-color: hsl(30, 100%, 50%);"
		value0="A01" value1="001 Piano 1"
		label2="LEVEL" label3="PAN"
		value2="100" value3="0"
		label4="REVERB" label5="CHORUS"
		value4="40" value5="0"
		label6="K SHIFT" label7="MIDI CH"
		value6="± 0" value7="A01"
		bitmap="000000000000000000000000000000000000000000000000000000000000ffff">
	</sound-canvas-lcd>

### sound-canvas-lcd-ex ([Demo](https://shingo45endo.github.io/sound-canvas-lcd/sound_canvas_lcd_ex.html))

	<script type="module" src="./sound_canvas_lcd_ex.js"></script>	<!-- "sound_canvas_lcd.js" needs to be in the same directory -->
	<script type="module">
	window.addEventListener('DOMContentLoaded', () => {
		document.querySelector('sound-canvas-lcd-ex').inputBytes([0x90, 60, 100]);
	});
	</script>
	
	<sound-canvas-lcd-ex></sound-canvas-lcd-ex>


License
-------

MIT


Author
------

[shingo45endo](https://github.com/shingo45endo)
