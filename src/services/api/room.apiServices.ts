export const RoomApiServices = {
	getToken: async (participantName: string, roomName: string) => {
		const res = await fetch('/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ participantName, roomName })
		});
		return await res.json();
	}
};
