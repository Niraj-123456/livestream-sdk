export function scrObject(node: HTMLMediaElement, stream: MediaStream) {
	node.srcObject = stream;
	node.play();

	return {
		update(newStream: MediaStream) {
			if (node.srcObject !== newStream) {
				node.srcObject = newStream;
				node.play();
			}
		}
	};
}
