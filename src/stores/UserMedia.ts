import { browser } from '$app/environment';
import type { Readable } from 'svelte/store';

export type Media = {
	video: MediaStreamTrack | undefined;
	audio: MediaStreamTrack | undefined;
	stream: MediaStream | undefined;
};

const defaultMedia = () => ({
	video: undefined,
	audio: undefined,
	stream: undefined
});

export type MediaHook = (Media: Media) => unknown;

class UserMediaStore implements Readable<Media> {
	private subscribers = new Set<MediaHook>();
	private value: Media = defaultMedia();

	private dispatch(newStream: MediaStream) {
		const videos = newStream.getVideoTracks();
		const audios = newStream.getAudioTracks();
		const output = defaultMedia();

		if (videos.length) {
			//@ts-expect-error throws type error undefined is not assignable to MediaStreamTrack
			output.video = videos[0];
		}

		if (audios.length) {
			//@ts-expect-error throws type error undefined is not assignable to MediaStreamTrack
			output.audio = audios[0];
		}

		//@ts-expect-error throws type error undefined is not assignable to MediaStream
		output.stream = newStream;
		this.value = output;
		this.subscribers.forEach((v) => v(output));
	}

	async request(constraints: MediaStreamConstraints) {
		if (!browser) return;
		console.log('constraints', constraints);

		try {
			const media = await navigator.mediaDevices.getUserMedia(constraints);
			this.dispatch(media);
		} catch (e) {
			console.log('error', e);
		}
	}

	subscribe(hook: MediaHook) {
		this.subscribers.add(hook);
		hook(this.value);
		return () => this.subscribers.delete(hook);
	}
}

export const UserMedia = new UserMediaStore();
