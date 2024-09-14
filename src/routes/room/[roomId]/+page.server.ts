import cookie from 'cookie';

export async function load({ request }) {
	const header = request.headers.get('cookie');

	const cookies = cookie.parse(header ?? '');

	const token = cookies['token'];

	return { token };
}
