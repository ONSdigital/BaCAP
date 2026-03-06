import Tooltip from './Tooltip.svelte';
import { mount, unmount } from "svelte";

export default function tooltip(element) {
	let title;
	let tooltipComponent;
	function mouseOver(event) {
		// NOTE: remove the `title` attribute, to prevent showing the default browser tooltip
		// remember to set it back on `mouseleave`
		title = element.getAttribute('title');
		element.removeAttribute('title');

		let body = document.body.getBoundingClientRect();
		let pos = element.getBoundingClientRect();
		let y = pos.bottom;
		let x = (pos.left + pos.right) / 2;

		tooltipComponent = mount(Tooltip, {
        			props: {
        				title: title,
        				x: x,
        				y: y - body.y,
        				width: body.width
        			},
        			target: document.body,
        		});
	}
	function mouseOut() {
		unmount(tooltipComponent);
		// NOTE: restore the `title` attribute
		element.setAttribute('title', title);
	}

	element.addEventListener('mouseover', mouseOver);
	element.addEventListener('mouseout', mouseOut);

	return {
		destroy() {
			if (tooltipComponent) unmount(tooltipComponent);
			element.removeEventListener('mouseover', mouseOver);
			element.removeEventListener('mouseout', mouseOut);
		}
	}
}