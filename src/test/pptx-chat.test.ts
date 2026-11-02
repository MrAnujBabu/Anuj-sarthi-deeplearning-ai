// @vitest-environment node
import { expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { pdfsToText } from '@/lib/pdf-text';

it('reads PPTX in slide order into document text without retaining the binary', async () => {
  const zip = zipSync({ 'ppt/slides/slide2.xml': strToU8('<a:p><a:t>Answer: 6 N</a:t></a:p>'), 'ppt/slides/slide1.xml': strToU8('<a:p><a:t>Force = mass x acceleration</a:t></a:p>') });
  const url = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${Buffer.from(zip).toString('base64')}`;
  const result = await pdfsToText([{ type: 'file', filename: 'lesson.pptx', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', url }]);
  expect(result.files).toEqual([]);
  expect(result.text).toContain('[Slide 1]\nForce = mass x acceleration');
  expect(result.text).toContain('[Slide 2]\nAnswer: 6 N');
});
it('rejects legacy PPT instead of pretending it was read', async () => {
  await expect(pdfsToText([{ type: 'file', filename: 'old.ppt', mediaType: 'application/vnd.ms-powerpoint', url: 'data:;base64,' }])).rejects.toThrow('Export it as PDF');
});