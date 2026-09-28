import { mount as travel } from './travel/index.js';
import { mount as cinema } from './cinema/index.js?v=30';
import { mount as stories } from './stories/index.js';
import { mount as bucketlist } from './bucketlist/index.js?v=30';
const renderers = { travel, cinema, stories, bucketlist };
export function mountModule(context) {
  const mount = renderers[context.item.id];
  if (!mount) throw new Error(`Missing module renderer: ${context.item.id}`);
  const cleanup = mount(context);
  return typeof cleanup === 'function' ? cleanup : () => {};
}
export const moduleIds = Object.keys(renderers);
