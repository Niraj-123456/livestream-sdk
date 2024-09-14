import MediaDeviceStore from '../../../stores/MediaDeviceStore.js';
import { RoomStore } from '../../../stores/RoomStore.js';
import { LocalParticipant, Participant, Track, TrackPublication } from 'livekit-client';

export class _RoomLayoutController {
	// ratios
	_ratios = ['16:9', '4:3', '1:1', '1:2'];

	// default options
	_scenary: unknown;
	participantArea: HTMLDivElement | null = null;
	_conference: HTMLDivElement | null = null;
	_margin = 5;
	_aspect = 0;
	_video = false;
	_ratio = this.ratio(); // to perfomance call here
	_width = 0;
	_height = 0;
	_renderer: unknown;
	_isFullScreen = false;
	_layoutIds = {
		conferenceArea: 'conferenceArea',
		participantArea: 'participantArea',
		screenShareArea: 'screeanShareArea',
		fullScreenArea: 'fullScreenArea'
	};

	$ = (id: string) => document.getElementById(id);

	// calculate dimensions
	dimensions(element: HTMLElement) {
		if (!element) return;
		return {
			height: element.offsetHeight - this._margin * 2,
			width: element.offsetWidth - this._margin * 2
		};
	}

	// resizer of cameras
	resizer(width: number, element: HTMLElement | null, isScreenShare = false) {
		if (!element) return;
		for (let s = 0; s < element.children.length; s++) {
			// camera fron dish (div without class)
			const el = element.children[s] as HTMLElement;

			// custom margin
			el.style.margin = this._margin + 'px';

			// calculate dimensions
			el.style.width = width + 'px';
			if (isScreenShare) {
				el.style.height = (width * 9) / 16 + 'px';
			} else {
				el.style.height = width * this._ratio + 'px';
			}

			// to show the aspect ratio in demo (optional)
			el.setAttribute('data-aspect', this._ratios[this._aspect]);
		}
	}

	calculateArea(element: HTMLElement | null) {
		if (!element) return;
		const dimensions = this.dimensions(element);

		if (!dimensions) return;
		let max = 0;
		let i = 1;
		while (i < 5000) {
			const area = this.area(i, element, dimensions?.height, dimensions?.width);
			if (area === false) {
				max = i - 1;
				break;
			}
			i++;
		}

		// remove margins
		return (max = max - this._margin * 2);
	}

	screenShareAreaResize(screenShareAreaId = this._layoutIds.screenShareArea) {
		const screenShareArea = this.$(screenShareAreaId);
		if (!screenShareArea) return;
		let max = 0;
		if (this.checkScreenWidth(820)) {
			max = screenShareArea.offsetWidth;
		} else {
			max = this.calculateArea(screenShareArea) || 0;
		}
		this.resizer(max, screenShareArea, true);
	}

	participantAreaResize() {
		const area = this.$(this._layoutIds.participantArea);
		const max = this.calculateArea(area);

		if (!max) return;
		this.resizer(max, area);
	}

	resize() {
		this.participantAreaResize();
		this.screenShareAreaResize();
	}

	// split aspect ratio (format n:n)
	ratio() {
		const ratio = this._ratios[this._aspect].split(':');
		return parseInt(ratio[1], 10) / parseInt(ratio[0], 10);
	}

	// return ratios
	ratios() {
		return this._ratios;
	}

	// set ratio
	aspect(i: number) {
		this._aspect = i;
		this._ratio = this.ratio();
		this.resize();
	}

	// get screen size
	setAspectRationByWidth() {
		const width = window.innerWidth;
		if (width > 820) {
			this.aspect(0);
		} else {
			this.aspect(2);
		}
	}

	// calculate area of dish:
	area(increment: number, element: HTMLElement, height: number, width: number) {
		let i = 0;
		let w = 0;
		let h = increment * this._ratio + this._margin * 2;
		while (i < element.children.length) {
			if (w + increment > width) {
				w = 0;
				h = h + increment * this._ratio + this._margin * 2;
			}
			w = w + increment + this._margin * 2;
			i++;
		}
		if (h > height || increment > width) return false;
		else return increment;
	}

	// to render partipant camera
	renderParticipant(participant: Participant, from: string, remove?: boolean) {
		console.log(from, remove);

		const {
			identity,
			name,
			isLocal,
			isCameraEnabled,
			isMicrophoneEnabled,
			isSpeaking,
			trackPublications,
			videoTrackPublications
		} = participant;

		console.log('paticipant', participant);

		this.participantArea = this.$(this._layoutIds.participantArea) as HTMLDivElement;
		if (!this.participantArea) return;
		const micPub = participant.getTrackPublication(Track.Source.Microphone);
		const cameraPub = participant.getTrackPublication(Track.Source.Camera);
		const micEnabled = micPub && micPub.isSubscribed && !micPub.isMuted;
		const cameraEnabled = cameraPub && cameraPub.isSubscribed && !cameraPub.isMuted;

		if (participant instanceof LocalParticipant) {
			const isAudioEnable = participant.isMicrophoneEnabled;
			const isCameraEnable = participant.isCameraEnabled;
			const deviceConfig = MediaDeviceStore.getValues();
			if (!deviceConfig) return;
			MediaDeviceStore.updateStore({
				isMicrophoneEnabled: deviceConfig.isMicrophoneEnabled,
				isCameraEnabled: deviceConfig.isCameraEnabled
			});
			if (isAudioEnable !== deviceConfig.isMicrophoneEnabled) {
				Promise.resolve(participant.setMicrophoneEnabled(!isAudioEnable));
			}

			if (isCameraEnable !== deviceConfig.isCameraEnabled) {
				Promise.resolve(participant.setCameraEnabled(!isCameraEnable));
			}
		}

		let div = <HTMLDivElement>this.$(`participant-${identity}`);

		if (!div && !remove) {
			div = document.createElement('div');
			div.id = `participant-${identity}`;
			div.className = 'participant';
			div.setAttribute('data-local-participant', String(isLocal));
			div.setAttribute('data-audio-muted', String(!isMicrophoneEnabled));
			div.setAttribute('data-video-muted', String(!isCameraEnabled));
			div.setAttribute('data-speaking', String(isSpeaking));

			div.innerHTML = `
      <video id="video-${identity}"></video>
      <audio id="audio-${identity}"></audio>
      <div class="info-bar">
        <div id="name-${identity}" class="name">
            ${name ? name : identity} ${participant instanceof LocalParticipant ? ' (You)' : ''}
        </div>
      </div>
      <div class="right">
          <span id="mic-${identity}">
          </span>
        </div>
        
        <div id="thum-${identity}" class="thums">
          <svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-round"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
    `;
			this.participantArea.appendChild(div);
		}

		const videoElm = <HTMLVideoElement>this.$(`video-${identity}`);
		const audioELm = <HTMLAudioElement>this.$(`audio-${identity}`);

		for (const value of trackPublications.entries()) {
			div?.setAttribute('data-source', value[1].source);
			videoElm?.setAttribute('data-source', value[1].source);
		}

		videoElm?.setAttribute('data-local-participant', String(isLocal));
		for (const value of videoTrackPublications.values()) {
			const { width, height } = value.dimensions!;
			const orientation = height > width ? 'portrait' : 'landscape';
			videoElm?.setAttribute('data-orientation', orientation);
		}

		if (remove) {
			div?.remove();
			if (videoElm) {
				videoElm.srcObject = null;
				videoElm.src = '';
			}
			if (audioELm) {
				audioELm.srcObject = null;
				audioELm.src = '';
			}
		}

		if (cameraEnabled) {
			if (videoElm) {
				videoElm.style.zIndex = '10';
				div.setAttribute('data-video-muted', 'false');
				if (participant instanceof LocalParticipant) {
					// flip
					videoElm.style.transform = 'scale(-1, 1)';
				} else if (!cameraPub?.videoTrack?.attachedElements.includes(videoElm)) {
					// const renderStartTime = Date.now();
				}
			}
			cameraPub?.videoTrack?.attach(videoElm);
		} else {
			// clear information display
			div.setAttribute('data-video-muted', 'true');
			if (cameraPub?.videoTrack && videoElm) {
				videoElm.style.zIndex = '9';
				cameraPub.videoTrack?.detach(videoElm);
			} else {
				if (videoElm) {
					videoElm.style.zIndex = '9';
					videoElm.src = '';
					videoElm.srcObject = null;
				}
			}
		}

		const micElm = this.$(`mic-${identity}`)!;

		if (micElm) {
			if (micEnabled) {
				if (!(participant instanceof LocalParticipant)) {
					micPub?.audioTrack?.attach(audioELm);
				}
				div.setAttribute('data-audio-muted', 'false');
				micElm.innerHTML = ``;
				micElm.style.display = 'none';
			} else {
				div.setAttribute('data-audio-muted', 'true');
				micElm.style.display = 'flex';
				micElm.innerHTML = ` <svg class="icon w-5" viewBox="0 0 24 24" fill="none" stroke="black">
                    <path stroke="none" d = "M0 0h24v24H0z" fill = "none" />
                    <path d="M3 3l18 18" />
                    <path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -.13 .874m-2 2a3 3 0 0 1 -3.87 -2.872v-1" />
                    <path d="M5 10a7 7 0 0 0 10.846 5.85m2 -2a6.967 6.967 0 0 0 1.152 -3.85" />
                    <path d="M8 21l8 0" />
                    <path d="M12 17l0 4" />
                </svg>`;
			}
		}

		this.resize();
	}

	// to render screen share
	renderScreenShare(participant: Participant, from: string, remove = false) {
		console.log(from, remove);

		RoomStore.updateStore({ isLoading: true });
		try {
			const { identity, name } = participant;
			const screenSharePub: TrackPublication | undefined = participant.getTrackPublication(
				Track.Source.ScreenShare
			);

			const screenShareAudioPub = participant.getTrackPublication(Track.Source.ScreenShareAudio);
			let div = <HTMLDivElement>this.$(`screenShare-${identity}`);
			if (!div && !remove) {
				div = document.createElement('div');
				div.id = `screenShare-${participant?.identity}`;
				div.className = 'participant';
			}

			const infoDiv = document.createElement('div');
			infoDiv.className = 'info-bar';
			infoDiv.innerHTML = `<div id="name-${identity}" class="name">
            ${participant instanceof LocalParticipant ? ' You' : name ? name : identity} presenting
        </div>`;

			const videoElm = document.createElement('video');
			videoElm.id = `participantScreen-${identity}`;
			if (remove && div) {
				const screensArea = this.$(this._layoutIds.screenShareArea);
				if (!screensArea) return;

				if (screensArea.childNodes.length > 1) {
					screensArea.removeChild(div);
				} else {
					screensArea.innerHTML = '';
					screensArea.style.display = 'none';
					if (participant instanceof LocalParticipant) {
						RoomStore.updateStore({ isScreenShare: false });
					}
					if (videoElm) {
						videoElm.srcObject = null;
						videoElm.src = '';
					}
				}
			}
			if (screenSharePub && !remove) {
				this.expand();
				if (screenSharePub && participant) {
					screenSharePub.videoTrack?.attach(videoElm);
					if (screenShareAudioPub) {
						screenShareAudioPub.audioTrack?.attach(videoElm);
					}

					if (participant instanceof LocalParticipant) {
						RoomStore.updateStore({ isScreenShare: true });
					}
				}
				div.append(videoElm, infoDiv);
				this.$(this._layoutIds.screenShareArea)?.append(div);
			} else {
				if (participant instanceof LocalParticipant) {
					RoomStore.updateStore({ isScreenShare: false });
				}
				if (videoElm) {
					videoElm.src = '';
					videoElm.srcObject = null;
				}
			}

			this.resize();
		} catch (error) {
			console.log(error);
		} finally {
			RoomStore.updateStore({ isLoading: false });
		}
	}

	// set screen scenary
	expand() {
		// detect screen exist
		const screens = this.$(this._layoutIds.screenShareArea);
		if (!screens) return;
		screens.style.display = 'flex';
	}

	// to metch media queary screen
	metchScreen() {
		const mediamScreenQueary = window.matchMedia('(max-width: 820px)');
		if (mediamScreenQueary.matches) {
			this.aspect(1);
		} else {
			this.aspect(0);
		}
	}

	// check screen queary
	checkScreenWidth(width: number) {
		const screenQueary = window.matchMedia(`(max-width: ${width}px)`);
		if (screenQueary.matches) {
			return true;
		} else {
			return false;
		}
	}

	// to full screen room
	toggleFullscreen(elementId: string) {
		const element = this.$(elementId);
		if (!element) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			element.requestFullscreen();
		}
		this.resize();
	}
}

export const RoomLayoutController = new _RoomLayoutController();
