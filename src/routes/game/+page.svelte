<script lang="ts">
	import FingerprintJS from "@fingerprintjs/fingerprintjs";

	let canvas = $state<HTMLCanvasElement>()!;
	$effect(() => {
		const gl = canvas.getContext("webgl");
		const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
		const vendor = gl?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL); // e.g. "Apple Inc."
		const renderer = gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); // e.g. "Apple M2"
		console.log(`Vendor: ${vendor}, Renderer: ${renderer}`);

		const ctx = new AudioContext();
		const oscillator = ctx.createOscillator();
		const analyser = ctx.createAnalyser();
		const gain = ctx.createGain();
		gain.gain.value = 0; // silent
		oscillator.connect(analyser);
		analyser.connect(gain);
		gain.connect(ctx.destination);
		oscillator.start(0);
		const buffer = new Float32Array(analyser.frequencyBinCount);
		analyser.getFloatFrequencyData(buffer);
		// hash buffer values — they vary per device
		crypto.subtle.digest("SHA-256", new TextEncoder().encode(buffer.join(","))).then((hash) => {
			const hashArray = Array.from(new Uint8Array(hash));
			const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
			console.log(`Audio fingerprint hash: ${hashHex}`);
		});
	});
</script>

<div class="flex flex-col items-center gap-4">
	<h1 class="text-2xl font-bold">Game Page</h1>
	<!-- <p>Fingerprint: {vendor} - {renderer}</p> -->
	<canvas bind:this={canvas} class="border"></canvas>
</div>
