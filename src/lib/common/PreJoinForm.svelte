<script lang="ts">
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { z } from 'zod';
	import { fromError } from 'zod-validation-error';
	import { RoomApiServices } from '../../services/api/room.apiServices.js';
	import { setCookie } from '../../utils/cookies.js';

	const RoomDataSchema = z.object({
		participantName: z.string({ required_error: 'Participant Name is required.' }),
		roomNumber: z.string({ required_error: 'Room Number is required.' })
	});

	let isLoading = false;
	let participantName: string;
	let roomNumber: string;
	const validationErrors = writable(new Map<string | number, string>());

	const handleChange = (e: Event) => {
		const { value, name } = e.target as HTMLInputElement;
		if (name === 'participantName') {
			participantName = value;
		} else if (name === 'roomNumber') {
			roomNumber = value;
		} else {
			return;
		}

		// Validate the field using Zod schema
		const partialData = { [name]: value };
		const singleFieldSchema = z.object({ [name]: RoomDataSchema.shape[name] });

		try {
			singleFieldSchema.parse(partialData);
			validationErrors.update((map) => {
				map.delete(name);
				return map;
			});
		} catch (error) {
			validationErrors.update((map) => {
				if (error instanceof z.ZodError) {
					map.set(name, error.errors[0].message);
				}
				return map;
			});
		}
	};

	const generateRoomToken = async () => {
		const result = RoomDataSchema.safeParse({ participantName, roomNumber });
		if (!result.success) {
			const errors = fromError(result.error);
			errors.details.map((detail) => {
				validationErrors.update((map) => map.set(detail.path[0], detail.message));
			});
			return;
		}
		isLoading = true;

		try {
			const response = await RoomApiServices.getToken(participantName, roomNumber);
			if (response?.success) {
				setCookie('token', response?.payload?.token, 0.5);
				goto(`/room/${roomNumber}`);
			}
		} catch (error) {
			console.log('Failed to generate room token', error);
			// Add error handling for failed room token generation
		} finally {
			isLoading = false;
		}
	};
</script>

<div class="mt-4">
	<form on:submit|preventDefault={generateRoomToken}>
		<div class="flex flex-col gap-1">
			<label for="participantName" class="text-white text-sm mb-1">Your Name</label>
			<input
				type="text"
				name="participantName"
				placeholder="Enter your name"
				bind:value={participantName}
				on:change={handleChange}
				class="border border-gray-400 p-2 rounded-sm bg-gray-600 text-white"
			/>
			{#if $validationErrors.has('participantName')}
				<div class="text-xs text-red-500 pt-0.5">{$validationErrors.get('participantName')}</div>
			{/if}
		</div>
		<div class="flex flex-col gap-1 mt-4">
			<label for="roomNumber" class="text-white text-sm mb-1">Room Number</label>
			<input
				name="roomNumber"
				placeholder="Enter Room number"
				bind:value={roomNumber}
				on:change={handleChange}
				class="border border-gray-400 p-2 rounded-sm bg-gray-600 text-white"
			/>
			{#if $validationErrors.has('roomNumber')}
				<div class="text-xs text-red-500 pt-0.5">{$validationErrors.get('roomNumber')}</div>
			{/if}
		</div>
		<div class="mt-4">
			<button
				disabled={isLoading}
				type="submit"
				class="w-full text-gray-200 py-1 px-3 rounded-md border-2 border-gray-200 font-bold flex items-center justify-center gap-2 transition-all duration-200 ease-in-out hover:border-gray-400 hover:text-gray-400 disabled:border-gray-300 disabled:text-gray-300"
				>Join
			</button>
		</div>
	</form>
</div>
