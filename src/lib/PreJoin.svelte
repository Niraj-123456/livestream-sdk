<script lang="ts">
	import { createLocalAudioTrack, createLocalVideoTrack, LocalTrack, Room } from 'livekit-client';
	import { Mic, MicOff, Video, VideoOff } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import ParticipantPlaceholder from './room/components/ParticipantPlaceholder.svelte';
	import classNames from 'classnames';
	import MediaDeviceStore from '../stores/MediaDeviceStore.js';
	import PreJoinForm from './common/PreJoinForm.svelte';

	let videoEnabled: boolean = false;
	let audioEnabled: boolean = false;
	let videoTrack: LocalTrack | undefined;
	let audioTrack: LocalTrack | undefined;
	let videoPreviewEl: HTMLVideoElement;
	let videoDevice: MediaDeviceInfo;
	let audioDevice: MediaDeviceInfo;

	let deviceKinds = ['videoinput', 'audioinput', 'audiooutput'];

	const handleToggleAudio = () => {
		if (audioTrack) {
			audioTrack.stop();
			audioEnabled = !audioEnabled;
			audioTrack = undefined;
		} else {
			createAudioTracks(audioDevice.deviceId);
		}
	};

	const handleToggleVideo = async () => {
		if (videoTrack) {
			videoTrack.stop();
			videoEnabled = !videoEnabled;
			videoTrack = undefined;
		} else {
			createVideoTracks(videoDevice.deviceId);
		}
	};

	const createVideoTracks = (deviceId: string) => {
		createLocalVideoTrack({ deviceId }).then((track) => {
			videoEnabled = true;
			videoTrack = track;
			videoTrack.attach(videoPreviewEl);
		});
	};

	const createAudioTracks = (deviceId: string) => {
		createLocalAudioTrack({ deviceId }).then((track) => {
			audioEnabled = true;
			audioTrack = track;
		});
	};

	onMount(async () => {
		MediaDeviceStore.reset();
		acquireDevices();
	});

	const acquireDevices = async () => {
		deviceKinds.forEach(async (kind: any) => {
			const devices = await Room.getLocalDevices(kind);
			if (kind === 'videoinput') {
				selectVideoDevice(devices[0]);
				createVideoTracks(devices[0].deviceId);
				MediaDeviceStore.updateStore({ isCameraEnabled: true });
				MediaDeviceStore.updateSelectedDevice({ videoinput: devices[0] });
			} else if (kind === 'audioinput') {
				selectAudioDevice(devices[0]);
				createAudioTracks(devices[0].deviceId);
				MediaDeviceStore.updateSelectedDevice({ audioinput: devices[0] });
			} else {
				MediaDeviceStore.updateSelectedDevice({ audiooutput: devices[0] });
			}
			populateDevices(devices, kind, devices[0]?.deviceId);
		});
	};

	const populateDevices = (
		devices: MediaDeviceInfo[],
		elementId: string,
		defaultDeviceId: string
	) => {
		const element = document.getElementById(elementId);
		if (!element) return;
		devices.forEach((device) => {
			const option = document.createElement('option');
			option.value = device.deviceId;
			option.text = device.label;
			if (defaultDeviceId === device.deviceId) {
				option.selected = true;
			}
			element.appendChild(option);
		});
	};

	const selectVideoDevice = (device: MediaDeviceInfo) => {
		videoDevice = device;
		if (videoTrack) {
			if (videoTrack.mediaStreamTrack.getSettings().deviceId === device.deviceId) {
				return;
			}
			// stop video
			videoTrack.stop();
		}
	};

	const selectAudioDevice = (device: MediaDeviceInfo) => {
		audioDevice = device;
		if (audioTrack) {
			if (audioTrack.mediaStreamTrack.getSettings().deviceId === device.deviceId) {
				return;
			}

			audioTrack.stop();
		}
	};

	const handleDeviceChange = (e: Event) => {
		const { id, value } = e.target as HTMLSelectElement;
		const deviceInfo = {
			kind: id,
			deviceId: value
		};

		if (id === 'videoinput') {
			MediaDeviceStore.updateSelectedDevice({ videoinput: deviceInfo });
		} else if (id === 'audioinput') {
			MediaDeviceStore.updateSelectedDevice({ audioinput: deviceInfo });
		} else {
			MediaDeviceStore.updateSelectedDevice({ audiooutput: deviceInfo });
		}
	};

	onDestroy(() => {
		if (videoTrack) {
			videoTrack?.stop();
		}
	});
</script>

<div class="max-w-xl">
	<div
		class="w-full h-96 aspect-video place-items-center border rounded-md relative overflow-hidden bg-gradient-to-tl from-gray-700 to-gray-900"
	>
		<video
			class={classNames(
				`w-full h-full object-cover aspect-video transition-opacity duration-200 ease-in-out`,
				videoEnabled ? 'opacity-100' : 'opacity-0'
			)}
			bind:this={videoPreviewEl}
		>
			<track kind="captions" />
		</video>

		<ParticipantPlaceholder {videoEnabled} />
	</div>

	<div class="mt-4 flex items-center justify-center gap-3">
		<button
			class={classNames(
				'border-2 border-gray-200 px-2 py-1 rounded-md',
				audioEnabled ? 'text-gray-200' : 'text-gray-500'
			)}
			on:click={handleToggleAudio}
		>
			{#if audioEnabled}
				<Mic size={20} />
			{:else}
				<MicOff size={20} />
			{/if}
		</button>
		<button
			class={classNames(
				'border-2  px-2 py-1 rounded-md border-gray-200',
				videoEnabled ? 'text-gray-200' : ' text-gray-500'
			)}
			on:click={handleToggleVideo}
		>
			{#if videoEnabled}
				<Video size={20} />
			{:else}
				<VideoOff size={20} />
			{/if}
		</button>
	</div>

	<div
		class={classNames(
			`h-auto w-full flex justify-center items-center gap-1 lg:gap-2 relative mt-5`,
			'media-devices'
		)}
	>
		<select id="videoinput" on:change={handleDeviceChange} />
		<select id="audioinput" on:change={handleDeviceChange} />
		<select id="audiooutput" on:change={handleDeviceChange} />
	</div>

	<PreJoinForm />
</div>

<style>
	.media-devices select {
		width: 100%;
		padding: 10px;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.4);
		color: #fff;
		font-size: 14px;
	}
</style>
