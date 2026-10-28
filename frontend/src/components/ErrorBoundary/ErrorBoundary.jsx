import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

/**
 * 렌더링 중 에러가 나도 앱 전체가 꺼지지 않게 막는다 (React 는 잡지 못한 렌더 에러가 나면 화면을 통째로 지운다)
 * - 다시 시도: onReset 으로 에러 원인이 된 상태(예: 길찾기)를 비운 뒤 다시 그린다
 * - 이벤트 핸들러·비동기 코드의 에러는 잡지 못한다 (React 에러 바운더리의 한계)
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('화면 오류', error, info.componentStack)
  }

  reset = () => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className={styles.fallback} role="alert">
        <strong className={styles.title}>화면을 그리다 문제가 생겼어요</strong>
        <span className={styles.hint}>다시 시도해도 안 되면 새로고침해 주세요.</span>
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={this.reset}>다시 시도</button>
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>새로고침</button>
        </div>
      </div>
    )
  }
}
