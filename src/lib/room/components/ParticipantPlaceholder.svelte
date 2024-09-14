<script lang="ts">
	import classNames from 'classnames';

	export let videoEnabled: boolean;
</script>

<div
	class={classNames(
		'w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-offset-1 ring-[6px] ring-green-700 bg-blue-700 overflow-hidden transition-opacity duration-200 ease-in-out"',
		videoEnabled ? 'opacity-0' : 'opacity-100'
	)}
>
	<div class="text-white grid place-items-center h-full text-lg font-bold">N</div>
</div>
