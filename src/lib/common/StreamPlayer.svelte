<script lang="ts">
	import { scrObject } from '../../utils/useSrcObject.js';

	export let stream: MediaStream;
	export let volume = 0;
	let muted = true;
	$: muted = volume === 0;
</script>

<section>
	{#if stream.active}
		<video use:scrObject={stream} bind:muted>
			<track kind="captions" />
		</video>
	{/if}
</section>
