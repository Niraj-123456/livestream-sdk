<script lang="ts">
	import { goto } from '$app/navigation';
	import { Room } from 'livekit-client';
	import { LogOut, Mic, Video } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { RoomLayoutController } from '../controllers/RoomLayoutController.js';
	import { RoomController } from '../controllers/RoomController.js';
	import {
		RoomStore,
		type ConnectionStatusType,
		type DeviceStatus
	} from '../../../stores/RoomStore.js';
	import ControlBars from './ControlBars.svelte';
	import ParticipantTile from './ParticipantTile.svelte';
	import Loader from '$lib/common/Loader.svelte';
	import Toast from '$lib/common/Toast.svelte';

	export let token = '';
	let loading = false;
	let connectionStatus: ConnectionStatusType;
	let deviceStatus: DeviceStatus;
	let room: Room | undefined;
	let listernersInitialized: boolean = false;
	let roomInitializationPromise: any;

	const roomSubs = RoomStore.subscribe((res) => {
		room = res.currentRoom;
		loading = res.isLoading;
		connectionStatus = res.connectionStatus;
		deviceStatus = res.deviceStatus;
	});

	onMount(async () => {
		if (token) {
			RoomLayoutController.setAspectRationByWidth();
			roomInitializationPromise = RoomController.initializingRoom(token)
				.then(() => (listernersInitialized = true))
				.catch((err) => console.log('failed to connect to room', err));
		}
	});

	onDestroy(async () => {
		if (roomInitializationPromise) {
			await roomInitializationPromise;
		}
		if (listernersInitialized) {
			if (room) room.disconnect();
		} else {
			console.warn('Listeners were not initialized before distroying the component');
		}
		roomSubs;
	});
</script>

<div class="w-full h-full">
	<div class="flex flex-col p-0 h-[calc(100vh-60px)] justify-center items-center relative lg:p-5">
		{#if loading || (deviceStatus !== 'DEVICE_LOADED' && connectionStatus !== 'CONNECTED')}
			<Loader message="Connecting to the Room!" />
		{/if}
		<div
			id="conferenceArea"
			class="w-full h-full border border-white flex flex-1 rounded-md gap-1 max-w-full max-h-full flex-col justify-center items-center lg:flex-row"
		>
			<ParticipantTile />
		</div>
	</div>

	<ControlBars />
</div>
<Toast />
