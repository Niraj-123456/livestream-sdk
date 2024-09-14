<script lang="ts">
	import Room from '$lib/room/components/Room.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<Room token={data?.token} />
