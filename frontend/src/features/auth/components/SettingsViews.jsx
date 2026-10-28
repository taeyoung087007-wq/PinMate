import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Eye, EyeOff, KeyRound, MapPin, Search, ShieldCheck, Star, TriangleAlert, UserRound } from 'lucide-react'
import styles from '../pages/SettingsPage.module.css'

import { AVATARS, AVATAR_BACKGROUNDS, getAvatar, getAvatarColor } from '../avatars'
import { changePasswordApi, updateProfileApi, withdrawApi } from '../api'

function Actions({ onCancel, label, disabled = false, danger = false }) {
  return <div className={styles.formActions}>
    <button className={styles.secondaryButton} type="button" onClick={onCancel}>취소</button>
    <button className={danger ? styles.dangerButton : styles.primaryButton} type="submit" disabled={disabled}>{label}</button>
  </div>
}

function ServerError({ message }) {
  return message ? <p role="alert" className={styles.fieldError}>{message}</p> : null
}

export function ProfileEditor({ user, onSaved, onCancel }) {
  const [nickname, setNickname] = useState(user.nickname || '')
  const [avatarId, setAvatarId] = useState(getAvatar(user.avatarId).id)
  const avatar = getAvatar(avatarId)
  const [avatarColor, setAvatarColor] = useState(getAvatarColor(user.avatarBg))
  const colorName = AVATAR_BACKGROUNDS.find(color => color.value === avatarColor)?.name || '직접 고른 색'
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [pending, setPending] = useState(false)
  const inputRef = useRef(null)
  const id = useId()
  const submit = async e => {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError('닉네임은 2~30자로 입력해 주세요.')
      inputRef.current?.focus()
      return
    }
    setPending(true)
    setServerError('')
    try {
      onSaved(await updateProfileApi({ nickname: trimmed, avatarId, avatarBg: avatarColor }))
    } catch (err) {
      setServerError(err.message)
      setPending(false)
    }
  }
  return <form onSubmit={submit} noValidate>
    <div className={styles.editorCard}>
      <div className={styles.avatarEditor}>
        <img className={styles.avatarPreview} style={{ backgroundColor: avatarColor }} src={avatar.src} alt={`${colorName} 배경의 ${avatar.name} 아바타 미리보기`} width="96" height="96" />
        <div><span className={styles.avatarEyebrow}>나의 캐릭터</span><h2>{avatar.name}</h2><p>캐릭터와 배경색을 조합해<br />나만의 프로필을 만들어보세요.</p><span className={styles.colorSummary} aria-live="polite">{colorName} · {avatarColor.toUpperCase()}</span></div>
      </div>
      <fieldset className={styles.avatarPicker}>
        <legend>프로필 캐릭터 선택</legend>
        <div className={styles.avatarGrid}>
          {AVATARS.map(option => <label key={option.id} className={styles.avatarOption}>
            <input type="radio" name="profile-avatar" value={option.id} checked={avatarId === option.id} onChange={() => setAvatarId(option.id)} aria-label={option.name} />
            <span className={styles.avatarTile} style={{ backgroundColor: avatarColor }}>
              <img src={option.src} alt="" width="96" height="96" loading="lazy" decoding="async" />
              {avatarId === option.id && <span className={styles.avatarCheck}><Check size={13} strokeWidth={3} aria-hidden="true" /></span>}
            </span>
            <span className={styles.avatarName}>{option.name}</span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className={styles.backgroundPicker}>
        <legend>배경색 선택</legend>
        <div className={styles.backgroundGrid}>
          {AVATAR_BACKGROUNDS.map(color => <label className={styles.backgroundOption} key={color.value}>
            <input type="radio" name="avatar-background" value={color.value} checked={avatarColor === color.value} onChange={() => setAvatarColor(color.value)} aria-label={`${color.name} 배경`} />
            <span className={styles.backgroundSwatch} style={{ backgroundColor: color.value }}>
              {avatarColor === color.value && <span className={styles.colorCheck}><Check size={13} strokeWidth={3} aria-hidden="true" /></span>}
            </span>
            <span>{color.name}</span>
          </label>)}
        </div>
        <div className={styles.customColor}>
          <div><label htmlFor={`${id}-background`}>직접 고르기</label><p>원하는 색으로 더 다양하게 표현해 보세요.</p></div>
          <input id={`${id}-background`} type="color" value={avatarColor} onInput={e => setAvatarColor(e.currentTarget.value.toLowerCase())} onChange={e => setAvatarColor(e.target.value.toLowerCase())} aria-label="배경색 직접 고르기" />
        </div>
      </fieldset>
      <div className={styles.field}>
        <div className={styles.labelLine}><label htmlFor={`${id}-nickname`}>닉네임</label><span>{nickname.length}/30</span></div>
        <input ref={inputRef} id={`${id}-nickname`} name="nickname" value={nickname} maxLength={30} onChange={e => { setNickname(e.target.value); setError('') }} placeholder="모임에서 사용할 이름" autoComplete="nickname" aria-invalid={!!error} aria-describedby={`${id}-nickname-help`} />
        <p id={`${id}-nickname-help`} className={error ? styles.fieldError : styles.fieldHint}>{error || '2~30자 이내로 입력해 주세요.'}</p>
      </div>
      <div className={styles.field}><label htmlFor={`${id}-email`}>이메일</label>
        <input id={`${id}-email`} value={user.email || '등록된 이메일이 없습니다'} readOnly />
        <p className={styles.fieldHint}>가입할 때 등록한 이메일이에요.</p>
      </div>
    </div>
    <ServerError message={serverError} />
    <Actions onCancel={onCancel} label={pending ? '저장 중…' : '저장'} disabled={pending} />
  </form>
}

function PasswordField({ label, value, onChange, autoComplete, error, inputRef }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.passwordInput}>
      <input ref={inputRef} id={id} type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} maxLength={128} placeholder={label} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      <button type="button" onClick={() => setVisible(v => !v)} aria-label={`${label} ${visible ? '숨기기' : '표시'}`} aria-pressed={visible}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
    {error && <p id={`${id}-error`} className={styles.fieldError}>{error}</p>}
  </div>
}

export function PasswordEditor({ onCancel }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [submitted, setSubmitted] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')
  const [pending, setPending] = useState(false)
  const resultRef = useRef(null)
  useEffect(() => {
    if (done) {
      resultRef.current?.closest('main')?.scrollTo(0, 0)
      resultRef.current?.focus({ preventScroll: true })
    }
  }, [done])
  const currentRef = useRef(null)
  const nextRef = useRef(null)
  const confirmRef = useRef(null)
  const rules = [
    ['8자 이상 입력', values.next.length >= 8],
    ['영문과 숫자 포함', /[a-zA-Z]/.test(values.next) && /[0-9]/.test(values.next)],
    ['현재 비밀번호와 다르게', !!values.next && values.next !== values.current],
  ]
  const errors = {
    current: !values.current ? '현재 비밀번호를 입력해 주세요.' : '',
    next: rules.some(([, valid]) => !valid) ? '아래 비밀번호 조건을 확인해 주세요.' : '',
    confirm: !values.confirm ? '새 비밀번호를 한 번 더 입력해 주세요.' : values.next !== values.confirm ? '새 비밀번호가 일치하지 않아요.' : '',
  }
  const change = key => value => setValues(v => ({ ...v, [key]: value }))
  const submit = async e => {
    e.preventDefault()
    setSubmitted(true)
    if (errors.current) return currentRef.current?.focus()
    if (errors.next) return nextRef.current?.focus()
    if (errors.confirm) return confirmRef.current?.focus()
    setPending(true)
    setServerError('')
    try {
      await changePasswordApi({ currentPassword: values.current, newPassword: values.next })
      setValues({ current: '', next: '', confirm: '' })
      setDone(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setPending(false)
    }
  }
  if (done) return <div className={styles.result} role="status" ref={resultRef} tabIndex={-1}>
    <span className={styles.resultIcon}><ShieldCheck size={32} /></span>
    <h2>비밀번호를 변경했어요</h2><p>다음 로그인부터 새 비밀번호를 사용해 주세요.</p>
    <button className={styles.primaryButton} type="button" onClick={onCancel}>설정으로 돌아가기</button>
  </div>
  return <form onSubmit={submit} noValidate>
    <div className={styles.editorCard}>
      <div className={styles.formIntro}><KeyRound size={23} /><div><h2>새 비밀번호 설정</h2><p>새로운 비밀번호를 두 번 입력해 주세요.</p></div></div>
      <PasswordField label="현재 비밀번호" value={values.current} onChange={change('current')} autoComplete="current-password" error={submitted && errors.current} inputRef={currentRef} />
      <PasswordField label="새 비밀번호" value={values.next} onChange={change('next')} autoComplete="new-password" error={submitted && errors.next} inputRef={nextRef} />
      <ul className={styles.rules}>{rules.map(([label, valid]) => <li key={label} className={valid ? styles.ruleValid : ''}><Check size={14} aria-hidden="true" />{label}<span className={styles.srOnly}>{valid ? ' 충족' : ' 미충족'}</span></li>)}</ul>
      <PasswordField label="새 비밀번호 확인" value={values.confirm} onChange={change('confirm')} autoComplete="new-password" error={(submitted || !!values.confirm) && errors.confirm} inputRef={confirmRef} />
    </div>
    <ServerError message={serverError} />
    <Actions onCancel={onCancel} label={pending ? '변경 중…' : '비밀번호 변경'} disabled={pending} />
  </form>
}

export function RecommendedPlaces({ places, teamName, categories, status, onViewPlace, onExplore }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('name')
  const [selectedId, setSelectedId] = useState(null)
  const detailRef = useRef(null)
  useEffect(() => {
    if (selectedId !== null) {
      detailRef.current?.closest('main')?.scrollTo(0, 0)
      detailRef.current?.focus({ preventScroll: true })
    }
  }, [selectedId])
  const selected = places.find(p => p.id === selectedId)
  const results = places.filter(p => (category === 'all' || p.category === category) && `${p.name} ${p.address || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'popular' ? (b.recommenders?.length || 0) - (a.recommenders?.length || 0) : a.name.localeCompare(b.name, 'ko'))
  const categoryLabel = key => categories[key]?.label || '기타'
  if (status === 'loading') return <div className={styles.emptyState} role="status"><MapPin size={32} /><h2>추천한 장소를 불러오고 있어요</h2><p>잠시만 기다려 주세요.</p></div>
  if (status === 'error') return <div className={styles.emptyState} role="alert"><TriangleAlert size={32} /><h2>장소를 불러오지 못했어요</h2><p>지도 화면의 연결 상태를 확인한 뒤 다시 열어 주세요.</p><button className={styles.secondaryButton} type="button" onClick={onExplore}>지도로 돌아가기</button></div>
  if (selected) return <div>
    <button className={styles.back} type="button" onClick={() => setSelectedId(null)}><ArrowLeft size={16} />추천 목록으로</button>
    <article className={styles.placeDetail}>
      <div className={styles.placeCover}><MapPin size={42} strokeWidth={1.3} /><span>{categoryLabel(selected.category)}</span></div>
      <div className={styles.placeBody}>
        {selected.isAllApproved && <span className={styles.approved}><Star size={13} />모두 인정한 장소</span>}
        <h2 ref={detailRef} tabIndex={-1}>{selected.name}</h2><p className={styles.placeAddress}><MapPin size={15} />{selected.address || '주소 정보가 없습니다'}</p>
        <div className={styles.placeFacts}><span><UserRound size={16} />{selected.recommenders?.length || 0}명 추천</span><span><CheckCircle2 size={16} />{selected.visitedBy?.length || 0}명 방문</span></div>
        <div className={styles.memo}><h3>장소 한 줄 평</h3><p>{selected.memo || '아직 작성된 한 줄 평이 없어요.'}</p></div>
        <button className={styles.primaryButton} type="button" onClick={() => onViewPlace?.(selected)}><MapPin size={17} />지도에서 보기<ArrowUpRight size={16} /></button>
      </div>
    </article>
  </div>
  return <div>
    <div className={styles.collectionHeading}><div><span className={styles.scope}>{teamName || '선택한 모임'}</span><h2>내가 고른 장소 <span>{places.length}</span></h2></div><span className={styles.collectionIcon}><MapPin size={28} /></span></div>
    <p className={styles.fieldHint}>현재 선택한 모임에서 내가 추천한 장소입니다.</p>
    {places.length > 0 ? <>
      <div className={styles.searchBar}><Search size={18} aria-hidden="true" /><input aria-label="추천 장소 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="장소 이름 또는 주소 검색" />{query && <button type="button" onClick={() => setQuery('')}>지우기</button>}</div>
      <div className={styles.filters}><div className={styles.filterChips} aria-label="장소 분류">
        <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>전체</button>
        {Object.entries(categories).filter(([key]) => places.some(p => p.category === key)).map(([key, meta]) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{meta.label}</button>)}
      </div><select aria-label="장소 정렬" value={sort} onChange={e => setSort(e.target.value)}><option value="name">이름순</option><option value="popular">추천순</option></select></div>
      <p className={styles.resultCount} role="status">{results.length}개의 장소</p>
      {results.length ? <div className={styles.placeGrid}>{results.map(place => <button type="button" className={styles.placeCard} key={place.id} onClick={() => setSelectedId(place.id)}>
        <div className={styles.placeCategory}><MapPin size={17} /><span>{categoryLabel(place.category)}</span>{place.isAllApproved && <Star size={15} aria-label="모두 인정" />}</div>
        <h3>{place.name}</h3><p>{place.address || '주소 정보 없음'}</p>
        <div className={styles.placeCardFooter}><span>{place.recommenders?.length || 0}명 추천</span><ArrowUpRight size={17} /></div>
      </button>)}</div> : <div className={styles.emptyState}><Search size={30} /><h2>검색 결과가 없어요</h2><p>다른 이름이나 주소로 검색해 보세요.</p><button className={styles.secondaryButton} type="button" onClick={() => { setQuery(''); setCategory('all') }}>검색 초기화</button></div>}
    </> : <div className={styles.emptyState}><span className={styles.resultIcon}><MapPin size={32} /></span><h2>첫 번째 추천을 남겨보세요</h2><p>모임 지도에서 마음에 드는 장소를 추천하면<br />이곳에서 다시 찾아볼 수 있어요.</p><button className={styles.primaryButton} type="button" onClick={onExplore}>지도 둘러보기<ArrowUpRight size={16} /></button></div>}
  </div>
}

export function DeleteAccount({ onCancel, onWithdrawn }) {
  const [agreed, setAgreed] = useState(false)
  const [word, setWord] = useState('')
  const [serverError, setServerError] = useState('')
  const [pending, setPending] = useState(false)
  const id = useId()
  const submit = async e => {
    e.preventDefault()
    if (!agreed || word !== '탈퇴') return
    setPending(true)
    setServerError('')
    try {
      await withdrawApi()
      onWithdrawn()
    } catch (err) {
      setServerError(err.message)
      setPending(false)
    }
  }
  return <form onSubmit={submit}>
    <div className={styles.editorCard}>
      <div className={`${styles.formIntro} ${styles.dangerText}`}><TriangleAlert size={25} /><div><h2>탈퇴 전 확인해 주세요</h2><p>함께 남긴 장소의 기록은 모임에 남아요.</p></div></div>
      <ul className={styles.deleteNotes}><li><strong>계정 이용이 종료돼요</strong><p>탈퇴 후에는 이 계정으로 로그인할 수 없고, 참여한 모든 모임에서 나가요.</p></li><li><strong>추천 기록은 유지돼요</strong><p>모임에 남긴 장소와 추천은 지워지지 않아요.</p></li><li><strong>모임장은 탈퇴할 수 없어요</strong><p>내가 모임장인 모임이 있으면 탈퇴가 진행되지 않아요.</p></li></ul>
      <label className={styles.agreement}><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>위 내용을 확인했으며, 탈퇴에 동의합니다.</span></label>
      <div className={styles.field}><label htmlFor={id}>확인을 위해 ‘탈퇴’를 입력해 주세요</label><input id={id} value={word} onChange={e => setWord(e.target.value)} placeholder="탈퇴" autoComplete="off" /></div>
    </div>
    <ServerError message={serverError} />
    <Actions onCancel={onCancel} label={pending ? '탈퇴 처리 중…' : '회원 탈퇴'} disabled={pending || !agreed || word !== '탈퇴'} danger />
  </form>
}
