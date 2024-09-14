import { RoomStore } from '../../../stores/RoomStore.js';
import {
	ConnectionQuality,
	DisconnectReason,
	LocalParticipant,
	MediaDeviceFailure,
	Participant,
	ParticipantEvent,
	RemoteParticipant,
	RemoteTrack,
	RemoteTrackPublication,
	Room,
	type RoomConnectOptions,
	RoomEvent,
	type RoomOptions,
	Track,
	TrackPublication,
	VideoPresets
} from 'livekit-client';
import { RoomLayoutController } from './RoomLayoutController.js';
import MediaDeviceStore, { type ISelectedDevices } from '../../../stores/MediaDeviceStore.js';
import { config } from '../../../utils/config.js';

class _RoomController {
	startTime!: number;
	roomOptions: RoomOptions = {
		adaptiveStream: true,
		dynacast: true,
		publishDefaults: {
			simulcast: true,
			videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
			videoCodec: 'vp8'
		},
		videoCaptureDefaults: {
			resolution: VideoPresets.h720.resolution
		}
	};
	currentRoom: Room | undefined;

	state = {
		isFrontFacing: false,
		encoder: new TextEncoder(),
		decoder: new TextDecoder(),
		defaultDevices: new Map<MediaDeviceKind, string>(),
		bitrateInterval: undefined
	};

	elementMapping: { [k: string]: MediaDeviceKind } = {
		'video-input': 'videoinput',
		'audio-input': 'audioinput',
		'audio-output': 'audiooutput'
	};

	$ = (id: string) => document.getElementById(id);

	initializingRoom = async (token: string) => {
		const url = config.LIVEKIT_SERVER_URL;
		RoomStore.updateConnectionStatus('AUTHORIZED_ROOM');
		RoomStore.updateStore({ isLoading: true });

		try {
			await this.connectToRoom(url, token);
		} catch (error) {
			console.log(error);
		} finally {
			RoomStore.updateStore({ isLoading: false });
			RoomStore.updateConnectionStatus('CONNECTED');
		}
	};

	connectToRoom = async (url: string, token: string) => {
		RoomStore.updateConnectionStatus('CONNECTING');

		try {
			const connectOptions: RoomConnectOptions = {
				autoSubscribe: true
			};

			this.startTime = Date.now();
			const room = new Room(this.roomOptions);

			await room.prepareConnection(url);
			await room.connect(url, token, connectOptions);
			this.currentRoom = room;
			RoomStore.updateStore({ currentRoom: room });
			const elapsed = Date.now() - this.startTime;
			console.log(
				`successfully connected to ${room.name} in ${Math.round(elapsed)}ms`,
				await room.engine.getConnectedServerAddress()
			);
			this.roomListener(room);
			room.remoteParticipants.forEach((participant) => {
				this.participantConnected(participant);
			});
			this.participantConnected(room.localParticipant);
			return room;
		} catch (error) {
			console.log(error);
		}
	};

	roomListener = (room: Room) => {
		room
			.on(RoomEvent.ParticipantConnected, this.participantConnected)
			.on(RoomEvent.ParticipantDisconnected, this.participantDisconnected)
			.on(RoomEvent.DataReceived, this.handleData)
			.on(RoomEvent.Disconnected, this.handleRoomDisconnect)
			.on(RoomEvent.Reconnecting, () => console.log('Reconnecting to room'))
			.on(RoomEvent.Reconnected, async () => this.participantReconnected(room))
			.on(RoomEvent.LocalTrackPublished, this.publishedLocalParticipantTrack)
			.on(RoomEvent.LocalTrackUnpublished, this.unpublishedLocalParticipantTrack)
			.on(RoomEvent.TrackSubscribed, this.publishedRemoteParticipantTrack)
			.on(RoomEvent.TrackUnsubscribed, this.unpublishedRemoteParticipantTrack)
			.on(RoomEvent.MediaDevicesChanged, this.handleDevicesChanged)
			.on(RoomEvent.AudioPlaybackStatusChanged, () => {
				return;
			})
			.on(RoomEvent.MediaDevicesError, this.mediaDevicesError)
			.on(RoomEvent.ConnectionQualityChanged, this.connectionQuality)
			.on(RoomEvent.SignalConnected, async () => this.signalConnected(room));
	};

	publishedRemoteParticipantTrack = async (
		track: RemoteTrack,
		pub: RemoteTrackPublication,
		participant: Participant
	) => {
		if (!this.currentRoom) return;
		const room = this.currentRoom;
		if (room.remoteParticipants.size > 0) {
			RoomStore.updateStore({ isRemoteParticipant: true });
		} else {
			RoomStore.updateStore({ isRemoteParticipant: false });
		}
		RoomLayoutController.renderParticipant(participant, `${participant.identity} track published`);
		const screenSharePub: TrackPublication | undefined = participant.getTrackPublication(
			Track.Source.ScreenShare
		);

		if (!screenSharePub) {
			await room.localParticipant.setScreenShareEnabled(false, { audio: false });
			RoomLayoutController.renderScreenShare(
				participant,
				`${participant.identity} screen share published 115`,
				true
			);
		} else {
			RoomLayoutController.renderScreenShare(
				participant,
				`${participant.identity} screen share published 117`
			);
		}
	};

	publishedLocalParticipantTrack = async () => {
		if (!this.currentRoom) return;
		const room = this.currentRoom;
		const participant: LocalParticipant = room.localParticipant;
		if (participant) {
			this.unpublishedLocalParticipantTrack();
		}
		RoomLayoutController.renderParticipant(
			room.localParticipant,
			`${participant.identity} track published 132`,
			false
		);
		RoomLayoutController.renderScreenShare(
			room.localParticipant,
			`${participant.identity} screen share published 133`,
			false
		);
	};

	unpublishedRemoteParticipantTrack = (
		track: RemoteTrack,
		pub: RemoteTrackPublication,
		participant: Participant
	) => {
		if (!this.currentRoom) return;
		const room = this.currentRoom;
		const CameraPub: TrackPublication | undefined = participant.getTrackPublication(
			Track.Source.Camera
		);
		if (room.remoteParticipants.size > 0) {
			RoomStore.updateStore({ isRemoteParticipant: true });
		} else {
			RoomStore.updateStore({ isRemoteParticipant: false });
		}

		RoomLayoutController.renderParticipant(
			participant,
			`${participant.identity} track unpublished 149`,
			CameraPub ? false : true
		);
		RoomLayoutController.renderScreenShare(
			participant,
			`${participant.identity} screen share unpublished 150`,
			true
		);
	};

	unpublishedLocalParticipantTrack = () => {
		if (!this.currentRoom) return;
		const room = this.currentRoom;
		const participant: LocalParticipant = room.localParticipant;
		const cameraPub: TrackPublication | undefined = participant.getTrackPublication(
			Track.Source.Camera
		);
		const screenSharePub: TrackPublication | undefined = participant.getTrackPublication(
			Track.Source.ScreenShare
		);
		RoomLayoutController.renderParticipant(
			room.localParticipant,
			`${participant.identity} track unpublished 161`,
			!cameraPub ? false : true
		);
		RoomLayoutController.renderScreenShare(
			room.localParticipant,
			`${participant.identity} screen share unpublished 162`,
			!screenSharePub ? false : true
		);
	};

	connectionQuality = (quality: ConnectionQuality, participant?: Participant) => {
		console.log('connection quality changed', participant?.identity, quality);
	};

	mediaDevicesError = (e: Error) => {
		const failure = MediaDeviceFailure.getFailure(e);
		console.log('media device failure', failure);
	};

	signalConnected = async (room: Room) => {
		RoomStore.updateDeviceStatus('DEVICE_LOADING');
		const signalConnectionTime = Date.now() - this.startTime;
		console.log(`signal connection established in ${signalConnectionTime}ms`);
		try {
			await room.localParticipant?.enableCameraAndMicrophone();
			RoomStore.updateDeviceStatus('DEVICE_LOADED');
			RoomLayoutController.renderParticipant(room.localParticipant, 'TrackUnsubscribed 122');
		} catch {
			RoomStore.updateDeviceStatus('DEVICE_LOADING_FAILED');
		}
		console.log(`tracks published in ${Date.now() - this.startTime}ms`);
	};

	participantReconnected = async (room: Room) => {
		console.log('Successfully reconnected. server', await room.engine.getConnectedServerAddress());
	};

	participantDisconnected(participant: RemoteParticipant) {
		console.log('participant', participant.sid, 'disconnected');
		RoomStore.toast(`${participant?.name} left the room`);
		RoomStore.updateStore({ isRemoteParticipant: false });
		RoomLayoutController.renderParticipant(
			participant,
			'handleRoomDisconnect currentRoom 279',
			true
		);
		RoomLayoutController.renderScreenShare(participant, 'from participant diconnected 184', true);
	}

	async handleParticipantMediaDevices(participant: LocalParticipant) {
		if (participant instanceof LocalParticipant) {
			const isAudioEnable = participant.isMicrophoneEnabled;
			const isCameraEnable = participant.isCameraEnabled;
			const deviceConfig = MediaDeviceStore.getValues();
			if (!deviceConfig) return;
			MediaDeviceStore.updateStore({
				isMicrophoneEnabled: deviceConfig?.isMicrophoneEnabled,
				isCameraEnabled: deviceConfig?.isCameraEnabled
			});
			if (deviceConfig?.isMicrophoneEnabled !== isAudioEnable) {
				await participant.setMicrophoneEnabled(deviceConfig?.isMicrophoneEnabled);
			}
			if (deviceConfig?.isCameraEnabled !== isCameraEnable) {
				await participant.setCameraEnabled(deviceConfig?.isCameraEnabled);
			}
		}
	}

	disconnectRoom = () => {
		if (!this.currentRoom) return;

		this.currentRoom.disconnect();

		if (this.state.bitrateInterval) {
			clearInterval(this.state.bitrateInterval);
		}
	};

	async participantConnected(participant: Participant) {
		console.log('participant', participant.identity, 'connected', participant.metadata);

		if (participant instanceof RemoteParticipant) {
			RoomStore.toast(`${participant.name} joined the room`);
			RoomLayoutController.renderParticipant(
				participant,
				`${participant?.identity} connected 302`,
				false
			);
		}

		if (participant instanceof LocalParticipant) {
			await this.handleParticipantMediaDevices(participant);
		}

		participant
			.on(ParticipantEvent.TrackMuted, (pub: TrackPublication) => {
				console.log('track was muted', pub.trackSid, participant.identity);
				RoomLayoutController.renderParticipant(participant, 'participantConnected TrackMuted 254');
			})
			.on(ParticipantEvent.TrackUnmuted, (pub: TrackPublication) => {
				console.log('track was unmuted', pub.trackSid, participant.identity);
				RoomLayoutController.renderParticipant(
					participant,
					'participantConnected TrackUnmuted 258'
				);
			})
			.on(ParticipantEvent.IsSpeakingChanged, () => {
				// RoomLayoutController.renderParticipant(participant, `participantConnected ${participant.identity} IsSpeakingChanged 261`);
			});
	}

	handleRoomDisconnect(reason?: DisconnectReason) {
		if (!this.currentRoom) return;
		console.log('disconnected from room', { reason });

		// clear the chat area on disconnect
		const chat = <HTMLTextAreaElement>this.$('chat');
		chat.value = '';
		this.currentRoom = undefined;
		RoomStore.updateStore({ currentRoom: this.currentRoom });
	}

	sendMessage = async (message: string) => {
		if (!this.currentRoom) return;
		const encodedMsg = this.state.encoder.encode(JSON.stringify({ message }));
		this.currentRoom.localParticipant.publishData(encodedMsg, { reliable: false });
	};

	handleData(msg: Uint8Array, participant?: RemoteParticipant) {
		const time = `${Date.now()}`;
		const decoder = new TextDecoder();
		const str = JSON.parse(decoder.decode(msg));
		const payload = { message: str?.message, type: 'remote', name: participant?.name, time };
		RoomStore.toast(`message from ${participant?.name}`);
		RoomStore.updateMessageArray(payload);
	}

	handleDevicesChanged = () => {
		Promise.all(
			Object.keys(this.elementMapping).map(async (id) => {
				const kind = this.elementMapping[id];

				if (!kind) {
					return;
				}

				const devices = await Room.getLocalDevices(kind);
				const element = <HTMLSelectElement>this.$(id);
				this.populateSelect(element, devices);
			})
		);
	};

	populateSelect = (element: HTMLSelectElement, devices: MediaDeviceInfo[]) => {
		// clear all elements
		element.innerHTML = '';

		for (const device of devices) {
			const option = document.createElement('option');
			option.text = device.label;
			option.value = device.deviceId;
			const selectedDevices = MediaDeviceStore.getValues()?.selectedDevices;

			if (selectedDevices) {
				for (const property in selectedDevices) {
					if (device.deviceId === selectedDevices[property as keyof ISelectedDevices]?.deviceId) {
						option.selected = true;
					}
				}
			}
			element.appendChild(option);
		}
	};
}

export const RoomController = new _RoomController();
