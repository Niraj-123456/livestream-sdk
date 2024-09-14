import { writable, type Readable, type Writable } from 'svelte/store';

export type ISelectedDevices = {
	videoinput: {
		kind: string;
		deviceId: string;
	};
	audioinput: {
		kind: string;
		deviceId: string;
	};
	audiooutput: {
		kind: string;
		deviceId: string;
	};
};

export type IStore = {
	isCameraEnabled: boolean;
	isMicrophoneEnabled: boolean;
	selectedDevices: ISelectedDevices;
};

class _MediaDeviceStore implements Readable<IStore> {
	private store: Writable<IStore>;
	subscribe;

	constructor() {
		this.store = writable<IStore>({
			isCameraEnabled: false,
			isMicrophoneEnabled: false,
			selectedDevices: {
				videoinput: { kind: '', deviceId: '' },
				audioinput: { kind: '', deviceId: '' },
				audiooutput: { kind: '', deviceId: '' }
			}
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

	public updateSelectedDevice(payload: Partial<ISelectedDevices>) {
		this.store.update((pv) => ({ ...pv, selectedDevices: { ...pv.selectedDevices, ...payload } }));
	}

	public getValues() {
		let value: IStore | undefined;
		this.store.subscribe((v) => (value = v))();
		return value;
	}

	public reset() {
		this.store.set({
			isCameraEnabled: false,
			isMicrophoneEnabled: false,
			selectedDevices: {
				videoinput: { kind: '', deviceId: '' },
				audioinput: { kind: '', deviceId: '' },
				audiooutput: { kind: '', deviceId: '' }
			}
		});
	}
}

const MediaDeviceStore = new _MediaDeviceStore();
export default MediaDeviceStore;
