import { Room } from 'livekit-client';
import { writable, type Readable, type Writable } from 'svelte/store';

export type ConnectionStatusType =
	| 'AUTHORIZING_ROOM'
	| 'AUTHORIZED_ROOM'
	| 'AUTHORIZING_ROOM_FAILED'
	| 'AUTHORIZING'
	| 'AUTHORIZED'
	| 'AUTHORIZED_FAILED'
	| 'CONNECTING'
	| 'CONNECTED'
	| 'CONNECTION_FAILED'
	| 'DISCONNECTED'
	| 'RECONNECTING'
	| 'RECONNECTED'
	| 'RECONNECTION_FAILED'
	| '';

export type DeviceStatus = 'DEVICE_LOADING' | 'DEVICE_LOADED' | 'DEVICE_LOADING_FAILED' | '';

interface IMessages {
	message: string;
	type: string;
	name: string | undefined;
	time: string;
}

type IStore = {
	currentRoom: Room | undefined;
	isLoading: boolean;
	isRemoteParticipant: boolean;
	isScreenShare: boolean;
	connectionStatus: ConnectionStatusType;
	deviceStatus: DeviceStatus;
	toastMessage: string;
	messageArray: IMessages[];
};

const defaultRoomState: IStore = {
	currentRoom: undefined,
	isLoading: false,
	isRemoteParticipant: false,
	isScreenShare: false,
	connectionStatus: '',
	deviceStatus: '',
	toastMessage: '',
	messageArray: []
};

class _RoomStore implements Readable<IStore> {
	subscribe;
	private store: Writable<IStore>;

	constructor() {
		this.store = writable({
			...defaultRoomState
		});

		this.subscribe = this.store.subscribe;
	}

	select() {
		let value: IStore | undefined;
		this.store.subscribe((v) => (value = v))();
		return value;
	}

	public updateStore(payload: Partial<IStore>) {
		this.store.update((pv) => ({ ...pv, ...payload }));
	}

	public updateConnectionStatus(status: ConnectionStatusType) {
		this.store.update((pv) => ({ ...pv, connectionStatus: status }));
	}

	public updateDeviceStatus(status: DeviceStatus) {
		this.store.update((pv) => ({ ...pv, deviceStatus: status }));
	}

	public toast(message: string) {
		this.store.update((pv) => ({ ...pv, toastMessage: message }));
		setTimeout(() => {
			this.store.update((pv) => ({ ...pv, toastMessage: '' }));
		}, 3000);
	}

	public updateMessageArray(message: IMessages) {
		this.store.update((pv) => ({ ...pv, messageArray: [...pv.messageArray, message] }));
	}

	public reset() {
		this.store.set({
			...defaultRoomState
		});
	}
}

export const RoomStore = new _RoomStore();
