import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import type { LiveMapPreview } from '@/engine/liveProtocol'
import { useFrame } from '@/extras/useFrame'

import LiveMapCanvas from '../pages/LiveMapCanvas.vue'

vi.mock('@/extras/useFrame', () => ({ useFrame: vi.fn<typeof useFrame>() }))

const preview: LiveMapPreview = {
  mapId: 1,
  width: 80,
  height: 45,
  x: 11,
  y: 7,
  left: 0,
  top: 0,
  columns: 23,
  rows: 15,
  terrain: { left: 0, top: 0, columns: 31, rows: 23, tiles: '1'.repeat(31 * 23) },
}

it('pans beyond the first viewport without selecting a tile and follows the player on request', async () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const wrapper = mount(LiveMapCanvas, { props: { preview, selectedX: 11, selectedY: 7 } })
  try {
    const canvas = wrapper.get('canvas').element
    Object.defineProperty(canvas, 'setPointerCapture', { value: () => undefined })
    const step = vi.mocked(useFrame).mock.calls[0]?.[0]
    if (!step) throw new Error('Expected a map animation frame')

    function at(type: string, clientX: number, clientY: number) {
      canvas.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }))
    }

    at('pointerdown', 320, 32)
    at('pointermove', 32, 32)
    step(16)
    at('pointerup', 32, 32)
    at('click', 32, 32)
    expect(wrapper.emitted('camera')?.slice(-1)).toEqual([[{ mapId: 1, left: 18, top: 0 }]])
    expect(wrapper.emitted('select')).toBeUndefined()

    at('pointerdown', 32, 32)
    at('pointerup', 32, 32)
    at('click', 32, 32)
    expect(wrapper.emitted('select')).toEqual([[20, 2]])

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('camera')?.slice(-1)).toEqual([[null]])
    step(32)

    await wrapper.setProps({ preview: { ...preview, x: 13 } })
    step(48)
    at('click', 32, 32)
    expect(wrapper.emitted('select')?.slice(-1)).toEqual([[2, 2]])

    for (let time = 64; time <= 384; time += 16) step(time)
    at('click', 32, 32)
    expect(wrapper.emitted('select')?.slice(-1)).toEqual([[4, 2]])
  } finally {
    wrapper.unmount()
    context.mockRestore()
    vi.mocked(useFrame).mockClear()
  }
})
