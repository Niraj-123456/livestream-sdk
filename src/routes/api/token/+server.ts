import { json } from '@sveltejs/kit';
import { config } from '../../../utils/config.js';
import { AccessToken } from 'livekit-server-sdk';

export async function POST({ request }) {
	try {
		const { roomName, participantName } = await request.json();

		const identity = participantName.split(' ')[0] + '_' + Date.now() + '_' + roomName;

		const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_SECRET, {
			identity,
			name: participantName
		});

		at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
		const token = at.toJwt();
		const response = {
			message: 'success',
			statusCode: 200,
			success: true,
			payload: { token }
		};
		return json(response, { status: 200 });
	} catch (error) {
		return json(error, { status: 400 });
	}
}
