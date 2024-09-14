<script lang="ts">
	import { LogOut, Mic, MicOff, Video, VideoOff } from 'lucide-svelte';
	import { RoomController } from '../controllers/RoomController.js';
	import MediaDeviceStore from '../../../stores/MediaDeviceStore.js';
	import { RoomStore } from '../../../stores/RoomStore.js';
	import { onDestroy } from 'svelte';
	import type { Room } from 'livekit-client';
	import { goto } from '$app/navigation';
	import classNames from 'classnames';

	let isAudio = false;
	let isVideo = false;
	let currentRoom: Room | undefined;

	const RoomSubs = RoomStore.subscribe((res) => {
		currentRoom = res.currentRoom;
	});

	const MediaDeviceSubs = MediaDeviceStore.subscribe((res) => {
		isAudio = res.isMicrophoneEnabled;
		isVideo = res.isCameraEnabled;
	});

	const handleToggleAudio = async () => {
		isAudio = !isAudio;
		if (!currentRoom) return;
		let enabled = currentRoom.localParticipant.isMicrophoneEnabled;
		isAudio = !enabled;
		MediaDeviceStore.updateStore({ isMicrophoneEnabled: isAudio });
		await currentRoom.localParticipant.setMicrophoneEnabled(!enabled);
	};

	const handleToggleVideo = async () => {
		isVideo = !isVideo;
		if (!currentRoom) return;
		let enabled = currentRoom.localParticipant.isCameraEnabled;
		isVideo = !enabled;
		MediaDeviceStore.updateStore({ isCameraEnabled: isVideo });
		await currentRoom.localParticipant.setCameraEnabled(!enabled);
	};

	const handleDisconnect = () => {
		RoomController.disconnectRoom();
		goto('/');
	};

	onDestroy(() => {
		RoomSubs;
		MediaDeviceSubs;
	});
</script>

<div class="flex justify-center items-center gap-2">
	<button
		on:click={handleToggleAudio}
		class={classNames(
			'border-2 border-gray-200 px-2 py-1 rounded-md',
			isAudio ? 'text-gray-200' : 'text-gray-500'
		)}
	>
		{#if isAudio}
			<Mic size={18} />
		{:else}
			<MicOff size={18} />
		{/if}
	</button>
	<button
		on:click={handleToggleVideo}
		class={classNames(
			'border-2 border-gray-200 px-2 py-1 rounded-md',
			isVideo ? 'text-gray-200' : 'text-gray-500'
		)}
	>
		{#if isVideo}
			<Video size={18} />
		{:else}
			<VideoOff size={18} />
		{/if}
	</button>
	<button
		on:click={handleDisconnect}
		class="text-gray-200 py-1 px-3 rounded-md border-2 border-gray-200 font-bold text-sm flex items-center gap-2"
	>
		Leave
		<LogOut size={18} />
	</button>
</div>
