import { describe, it, expect } from 'vitest'
import { isActivationKey } from './keyboard'

describe('isActivationKey', () => {
  it('Enter 와 Space 를 활성화 키로 본다', () => {
    expect(isActivationKey('Enter')).toBe(true)
    expect(isActivationKey(' ')).toBe(true)
    expect(isActivationKey('Spacebar')).toBe(true)
  })

  it('Tab·방향키·글자·빈 값은 활성화하지 않는다', () => {
    expect(isActivationKey('Tab')).toBe(false)
    expect(isActivationKey('ArrowDown')).toBe(false)
    expect(isActivationKey('a')).toBe(false)
    expect(isActivationKey(undefined)).toBe(false)
  })
})
