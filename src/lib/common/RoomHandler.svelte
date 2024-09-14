<script lang="ts">
	import { getContext, onDestroy, setContext } from 'svelte';
	import { UserMedia } from '../../stores/UserMedia.js';
	import { derived, writable, type Writable } from 'svelte/store';
	import {
		RoomEvent,
		type LocalParticipant,
		type LocalTrack,
		type Participant,
		type RemoteParticipant,
		type Room
	} from 'livekit-client';
	import { User } from 'lucide-svelte';

	const unsubs: Array<() => void> = [];
	const room = getContext<Writable<Room>>('room');
	let participants: Writable<RemoteParticipant[]> = writable([]);

	unsubs.push(
		UserMedia.subscribe(async (media) => {
			if (!$room) return;
			if (media.video) {
				$room.localParticipant.videoTrackPublications.forEach((t) => {
					if (t.track) {
						$room.localParticipant.unpublishTrack(t.track);
					}
				});
				$room.localParticipant.publishTrack(media.video);
			}
			if (media.audio) {
				$room.localParticipant.audioTrackPublications.forEach((t) => {
					if (t.track) {
						$room.localParticipant.unpublishTrack(t.track);
					}
				});
				$room.localParticipant.publishTrack(media.audio);
			}
		})
	);

	console.log('unsubs', unsubs);

	onDestroy(() => unsubs.forEach((u) => u()));

	$participants = Array.from($room.remoteParticipants.values());

	$room.on(RoomEvent.ParticipantConnected, (participant) => {
		$participants = [...$participants, participant];
	});

	$room.on(RoomEvent.ParticipantDisconnected, (participant) => {
		$participants = $participants.filter((p) => p.sid !== participant.sid);
	});

	UserMedia.request({
		video: {
			aspectRatio: { ideal: 16 / 9 }
		},
		audio: true
	});

	setContext(
		'participants',
		derived(participants, (v) => v)
	);
</script>

<slot />
