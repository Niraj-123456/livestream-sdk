<script lang="ts">
	import { onDestroy } from 'svelte';
	import { RoomStore } from '../../stores/RoomStore.js';

	export let message = '';

	const roomSubs = RoomStore.subscribe((res) => {
		message = res.toastMessage;
	});

	onDestroy(() => {
		roomSubs;
	});
</script>

<div id="toast" class:show={message} class:hide={!message}>
	<span>{message}</span>
</div>

<style lang="postcss">
	#toast {
		@apply max-w-xs bg-white rounded-sm shadow-2xl text-primary text-center px-4 py-2 fixed z-40 top-4 inline-flex transition-all text-xs sm:text-sm;
	}

	#toast.show {
		@apply left-5;
	}

	#toast.hide {
		@apply -left-96;
	}
</style>
